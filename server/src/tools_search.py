import os
import json
import time
from typing import List, Optional, Dict, Any, Union, Tuple
from enum import Enum
from pydantic import BaseModel, Field, validator
from langchain_openai import OpenAIEmbeddings

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.rag.pinecone_provider import PineconeProvider
from src.rag.retriever import Document, Chunk, Resource

DEFAULT_INDEX_NAME = "tools-search-v1"
DEFAULT_NAMESPACE = "test"
DEFAULT_BATCH_SIZE = 100
DEFAULT_TOP_K = 5
MAX_TOP_K = 50
EMBEDDING_DIMENSION = 1536
EMBEDDING_MODEL = "text-embedding-3-small"

# Error codes
class ErrorCode(Enum):
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
    INITIALIZATION_ERROR = "INITIALIZATION_ERROR"
    CONFIGURATION_ERROR = "CONFIGURATION_ERROR"
    DEPENDENCY_ERROR = "DEPENDENCY_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    EMBEDDING_ERROR = "EMBEDDING_ERROR"
    PINECONE_ERROR = "PINECONE_ERROR"
    UPSERT_ERROR = "UPSERT_ERROR"
    QUERY_ERROR = "QUERY_ERROR"
    DELETE_ERROR = "DELETE_ERROR"
    FETCH_ERROR = "FETCH_ERROR"
    FILE_LOAD_ERROR = "FILE_LOAD_ERROR"
    TOOLKIT_UPSERT_ERROR = "TOOLKIT_UPSERT_ERROR"
    TOOLKIT_QUERY_ERROR = "TOOLKIT_QUERY_ERROR"
    TOOLKIT_DELETE_ERROR = "TOOLKIT_DELETE_ERROR"
    BATCH_UPSERT_ERROR = "BATCH_UPSERT_ERROR"
    BATCH_DELETE_ERROR = "BATCH_DELETE_ERROR"
    STATS_ERROR = "STATS_ERROR"


class ToolParameter(BaseModel):
    """工具参数定义"""
    name: str = Field(..., description="参数名称")
    type: str = Field(..., description="参数类型")
    required: bool = Field(..., description="是否必需")
    description: Optional[str] = Field(None, description="参数描述")


class Toolkit(BaseModel):
    """工具包定义 - 包含多个相关工具的集合"""
    toolkit_id: int = Field(..., description="工具包ID")
    name: str = Field(..., description="工具包名称")
    description: str = Field(..., description="工具包描述")
    tools: List['Tool'] = Field(default_factory=list, description="包含的工具列表")


class Tool(BaseModel):
    """工具定义 - 属于某个工具包的具体工具"""
    action_id: int = Field(..., description="工具ID (全局唯一)")
    toolkit_id: int = Field(..., description="所属工具包ID")
    tool_name: str = Field(..., description="工具名称")
    description: str = Field(..., description="工具描述")
    parameters: List[ToolParameter] = Field(default_factory=list, description="工具参数")
    toolkit: str = Field(..., description="工具包名称")


class ToolSearchRequest(BaseModel):
    """工具搜索请求"""
    query: str = Field(..., description="搜索查询")
    top_k: int = Field(5, ge=1, le=50, description="返回结果数量")
    filters: Optional[Dict[str, Any]] = Field(None, description="过滤条件")



class ToolSearchResponse(BaseModel):
    """工具搜索响应"""
    tool_name: str
    action_id: int
    toolkit_id: int
    description: str
    parameters: List[ToolParameter]
    score: float = Field(..., description="相似度分数 (0-1)")



class ToolkitSearchRequest(BaseModel):
    """工具包搜索请求"""
    query: str = Field(..., description="搜索查询")
    top_k: int = Field(5, ge=1, le=50, description="返回结果数量")
    filters: Optional[Dict[str, Any]] = Field(None, description="过滤条件")


class ToolkitSearchResponse(BaseModel):
    """工具包搜索响应"""
    toolkit_id: int
    name: str
    description: str
    tools_count: int = Field(..., description="包含的工具数量")
    sample_tools: List[str] = Field(default_factory=list, description="示例工具名称")


class ToolSearchError(Exception):
    """工具搜索错误"""
    def __init__(self, message: str, error_code: Union[str, ErrorCode] = ErrorCode.UNKNOWN_ERROR):
        self.message = message
        self.error_code = error_code.value if isinstance(error_code, ErrorCode) else error_code
        super().__init__(self.message)


# Utility functions
def parse_tool_parameters(parameters_str: Union[str, List[Dict], None]) -> List[ToolParameter]:
    """解析工具参数，处理多种输入格式"""
    if not parameters_str:
        return []
    
    parameters = []
    try:
        if isinstance(parameters_str, str):
            params_data = json.loads(parameters_str)
        elif isinstance(parameters_str, list):
            params_data = parameters_str
        else:
            return []
        
        for param_dict in params_data:
            parameters.append(ToolParameter(**param_dict))
    except (json.JSONDecodeError, TypeError, ValueError):
        # 如果解析失败，返回空列表
        pass
    
    return parameters


def build_tool_metadata(tool: Tool) -> Dict[str, Any]:
    """构建工具的元数据"""
    return {
        "action_id": tool.action_id,
        "toolkit_id": tool.toolkit_id,
        "tool_name": tool.tool_name,
        "description": tool.description,
        "toolkit_name": getattr(tool, 'toolkit_name', tool.toolkit),
        "parameters": json.dumps([param.model_dump() for param in tool.parameters])
    }


def metadata_to_tool(metadata: Dict[str, Any]) -> Tool:
    """从元数据构建工具对象"""
    parameters = parse_tool_parameters(metadata.get("parameters"))
    
    return Tool(
        action_id=metadata.get("action_id", 0),
        toolkit_id=metadata.get("toolkit_id", 0),
        tool_name=metadata.get("tool_name", ""),
        description=metadata.get("description", ""),
        parameters=parameters,
        toolkit=metadata.get("toolkit_name", "")
    )


class ToolSearchProvider(PineconeProvider):
    """
    工具搜索提供者，继承自 PineconeProvider
    专门用于工具和工具包的搜索管理
    """
    
    def __init__(self, 
                 index_name: str = DEFAULT_INDEX_NAME,
                 embedding_model: str = EMBEDDING_MODEL,
                 embedding_dimension: int = EMBEDDING_DIMENSION):
        # 初始化父类
        super().__init__()
        
        # 配置参数
        self.index_name = index_name
        self.embedding_model = embedding_model
        self.embedding_dimension = embedding_dimension
        
        # 初始化工具搜索专用的向量存储
        self._init_tool_vector_store()
        
        # 初始化 OpenAI embeddings for tools
        self._init_tool_embeddings()
    
    def _init_tool_vector_store(self):
        """初始化工具专用的向量存储"""
        try:
            # 检查索引是否存在，如果不存在则创建
            if not self.pc.has_index(self.index_name):
                from pinecone import ServerlessSpec
                spec = ServerlessSpec(
                    cloud=os.getenv("PINECONE_CLOUD", "aws"),
                    region=os.getenv("PINECONE_REGION", "us-east-1")
                )
                
                self.pc.create_index(
                    name=self.index_name,
                    dimension=self.embedding_dimension,
                    metric="cosine",
                    spec=spec
                )
            
            # 获取索引
            self.tool_index = self.pc.Index(self.index_name)
            
        except Exception as e:
            raise ToolSearchError(f"Failed to initialize tool vector store: {str(e)}", ErrorCode.INITIALIZATION_ERROR)
    
    def _init_tool_embeddings(self):
        """初始化工具专用的嵌入服务"""
        try:
            openai_api_key = os.getenv("OPENAI_API_KEY")
            if not openai_api_key:
                raise ToolSearchError("OPENAI_API_KEY environment variable is not set", ErrorCode.CONFIGURATION_ERROR)
            
            # 使用配置的嵌入模型
            self.tool_embeddings = OpenAIEmbeddings(
                model=self.embedding_model,
                openai_api_key=openai_api_key
            )
            
        except ImportError:
            raise ToolSearchError("langchain_openai is required for ToolSearchProvider", ErrorCode.DEPENDENCY_ERROR)
    
    def _create_embedding_text(self, tool: Tool) -> str:
        """
        创建嵌入文本模板
        格式: {toolkit_name} {tool_name} | {description} | params: {param1}, {param2}, … 
        """
        param_names = [param.name for param in tool.parameters]
        param_str = ", ".join(param_names) if param_names else "none"
        
        # 包含工具包信息以提升搜索相关性
        toolkit_name = getattr(tool, 'toolkit_name', tool.toolkit)
        embedding_text = f"{toolkit_name} {tool.tool_name} | {tool.description} | params: {param_str}"
        
        return embedding_text
    
    def _build_pinecone_filter(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """构建 Pinecone 过滤器"""
        if not filters:
            return {}
        
        pinecone_filter = {}
        
        # tool_name 过滤器 - $in 操作
        if tool_names := filters.get("tool_name"):
            if isinstance(tool_names, list):
                pinecone_filter["tool_name"] = {"$in": tool_names}
            else:
                pinecone_filter["tool_name"] = {"$in": [tool_names]}
        
        # toolkit 过滤器 - $in 操作
        if toolkits := filters.get("toolkit"):
            if isinstance(toolkits, list):
                pinecone_filter["toolkit_name"] = {"$in": toolkits}
            else:
                pinecone_filter["toolkit_name"] = {"$in": [toolkits]}
        
        # toolkit_id 过滤器
        if toolkit_ids := filters.get("toolkit_id"):
            if isinstance(toolkit_ids, list):
                pinecone_filter["toolkit_id"] = {"$in": toolkit_ids}
            else:
                pinecone_filter["toolkit_id"] = {"$in": [toolkit_ids]}
        
        # chain 过滤器 - $in 操作
        if chains := filters.get("chain"):
            if isinstance(chains, list):
                pinecone_filter["chain"] = {"$in": chains}
            else:
                pinecone_filter["chain"] = {"$in": [chains]}
        
        # required_params 过滤器 - $in 操作
        if required_params := filters.get("required_params"):
            if isinstance(required_params, list):
                # 检查是否包含所有必需参数
                for param in required_params:
                    if "required_params" not in pinecone_filter:
                        pinecone_filter["required_params"] = {"$in": [param]}
                    else:
                        # 对于多个参数，需要使用 $and 操作
                        existing_filter = pinecone_filter["required_params"]
                        pinecone_filter = {
                            "$and": [
                                {"required_params": existing_filter},
                                {"required_params": {"$in": [param]}}
                            ]
                        }
            else:
                pinecone_filter["required_params"] = {"$in": [required_params]}
        
        return pinecone_filter
    
    def _apply_post_filters(self, results: List[Dict], filters: Dict[str, Any]) -> List[Dict]:
        """应用后处理过滤器"""
        if not filters:
            return results
        
        filtered_results = []
        
        for result in results:
            metadata = result.get("metadata", {})
            should_include = True
            
            # 名称前缀过滤器
            if name_prefix := filters.get("name_prefix"):
                tool_name = metadata.get("tool_name", "")
                if not tool_name.startswith(name_prefix):
                    should_include = False
            
            if should_include:
                filtered_results.append(result)
        
        return filtered_results
    
    def _convert_distance_to_similarity(self, distance: float) -> float:
        """将距离转换为相似度分数 (0-1)"""
        # Pinecone 返回的是相似度分数，不是距离
        # 对于 cosine metric，分数范围是 [-1, 1]，需要归一化到 [0, 1]
        normalized_score = (distance + 1.0) / 2.0
        return round(max(0.0, min(1.0, normalized_score)), 4)
    
    # ==================== 工具包管理 ====================
    
    def upsert_toolkit(self, toolkit: Toolkit, namespace: str = DEFAULT_NAMESPACE) -> List[str]:
        """
        插入或更新工具包及其所有工具
        
        Args:
            toolkit: 工具包对象
            namespace: 命名空间
            
        Returns:
            vector_ids: 插入的工具向量ID列表
        """
        try:
            if not toolkit.tools:
                raise ToolSearchError("Toolkit must contain at least one tool", ErrorCode.VALIDATION_ERROR)
            
            # 批量插入工具包中的所有工具
            return self.upsert_tools(toolkit.tools, namespace)
            
        except Exception as e:
            raise ToolSearchError(f"Failed to upsert toolkit: {str(e)}", ErrorCode.TOOLKIT_UPSERT_ERROR)
    
    def get_toolkit_tools(self, toolkit_id: int, namespace: str = DEFAULT_NAMESPACE) -> List[Tool]:
        """
        获取工具包下的所有工具
        
        Args:
            toolkit_id: 工具包ID
            namespace: 命名空间
            
        Returns:
            工具列表
        """
        try:
            # 验证参数
            if toolkit_id <= 0:
                raise ToolSearchError("Invalid toolkit_id", ErrorCode.VALIDATION_ERROR)
            
            # 使用 fetch 方法通过前缀获取所有相关工具
            # 这比使用查询更高效
            prefix = f"{toolkit_id}_"
            
            # 获取索引统计以确定批次大小
            stats = self.tool_index.describe_index_stats()
            namespace_stats = stats.get('namespaces', {}).get(namespace, {})
            vector_count = namespace_stats.get('vector_count', 0)
            
            if vector_count == 0:
                return []
            
            # 构建过滤器查询
            pinecone_filter = self._build_pinecone_filter({"toolkit_id": toolkit_id})
            
            # 使用一个随机向量进行查询（因为我们主要依赖过滤器）
            import numpy as np
            random_vector = np.random.rand(self.embedding_dimension).tolist()
            
            # 执行查询
            query_response = self.tool_index.query(
                vector=random_vector,
                top_k=min(100, vector_count),  # 限制最大查询数量
                include_metadata=True,
                filter=pinecone_filter,
                namespace=namespace
            )
            
            tools = []
            for match in query_response.matches:
                tool = metadata_to_tool(match.metadata)
                tools.append(tool)
            
            return tools
            
        except ToolSearchError:
            raise
        except Exception as e:
            raise ToolSearchError(f"Failed to get toolkit tools: {str(e)}", ErrorCode.TOOLKIT_QUERY_ERROR)
    
    def delete_toolkit(self, toolkit_id: int, namespace: str = DEFAULT_NAMESPACE) -> int:
        """
        删除工具包及其所有工具
        
        Args:
            toolkit_id: 工具包ID
            namespace: 命名空间
            
        Returns:
            删除的工具数量
        """
        try:
            # 先获取工具包下的所有工具
            tools = self.get_toolkit_tools(toolkit_id, namespace)
            
            if not tools:
                return 0
            
            # 删除所有工具
            tool_ids = [tool.action_id for tool in tools]
            self.delete_tools(tool_ids, namespace)
            
            return len(tool_ids)
            
        except Exception as e:
            raise ToolSearchError(f"Failed to delete toolkit: {str(e)}", ErrorCode.TOOLKIT_DELETE_ERROR)
    
    # ==================== 工具管理 ====================
    
    def upsert_tool(self, tool: Tool, namespace: str = DEFAULT_NAMESPACE) -> str:
        """
        插入或更新单个工具
        
        Args:
            tool: 工具对象
            namespace: 命名空间
            
        Returns:
            vector_id: 向量ID
        """
        try:
            # 验证工具
            if tool.action_id <= 0:
                raise ToolSearchError("Invalid action_id", ErrorCode.VALIDATION_ERROR)
            
            # 生成嵌入文本
            embedding_text = self._create_embedding_text(tool)
            
            # 获取嵌入向量
            embedding = self.tool_embeddings.embed_query(embedding_text)
            
            # 构建元数据
            metadata = build_tool_metadata(tool)
            
            vector_id = str(tool.action_id)
            
            # 执行 upsert
            self.tool_index.upsert(
                vectors=[{
                    "id": vector_id,
                    "values": embedding,
                    "metadata": metadata
                }],
                namespace=namespace
            )
            
            return vector_id
            
        except ToolSearchError:
            raise
        except Exception as e:
            if "embedding" in str(e).lower():
                raise ToolSearchError(f"Failed to generate embedding: {str(e)}", ErrorCode.EMBEDDING_ERROR)
            elif "pinecone" in str(e).lower():
                raise ToolSearchError(f"Pinecone operation failed: {str(e)}", ErrorCode.PINECONE_ERROR)
            else:
                raise ToolSearchError(f"Failed to upsert tool: {str(e)}", ErrorCode.UPSERT_ERROR)
    
    def upsert_tools(self, tools: List[Tool], namespace: str = DEFAULT_NAMESPACE, batch_size: int = DEFAULT_BATCH_SIZE) -> List[str]:
        """
        批量插入或更新工具
        
        Args:
            tools: 工具列表
            namespace: 命名空间
            batch_size: 批处理大小
            
        Returns:
            vector_ids: 向量ID列表
        """
        try:
            if not tools:
                return []
            
            # 验证所有工具
            for tool in tools:
                if tool.action_id <= 0:
                    raise ToolSearchError(f"Invalid action_id: {tool.action_id}", ErrorCode.VALIDATION_ERROR)
            
            vector_ids = []
            
            # 批处理工具
            for i in range(0, len(tools), batch_size):
                batch_tools = tools[i:i + batch_size]
                batch_vectors = []
                
                # 批量生成嵌入
                embedding_texts = [self._create_embedding_text(tool) for tool in batch_tools]
                embeddings = self.tool_embeddings.embed_documents(embedding_texts)
                
                for tool, embedding in zip(batch_tools, embeddings):
                    # 构建元数据
                    metadata = build_tool_metadata(tool)
                    
                    vector_id = str(tool.action_id)
                    vector_ids.append(vector_id)
                    
                    batch_vectors.append({
                        "id": vector_id,
                        "values": embedding,
                        "metadata": metadata
                    })
                
                # 执行批量 upsert
                self.tool_index.upsert(
                    vectors=batch_vectors,
                    namespace=namespace
                )
            
            return vector_ids
            
        except ToolSearchError:
            raise
        except Exception as e:
            if "embedding" in str(e).lower():
                raise ToolSearchError(f"Failed to generate embeddings: {str(e)}", ErrorCode.EMBEDDING_ERROR)
            elif "pinecone" in str(e).lower():
                raise ToolSearchError(f"Pinecone batch operation failed: {str(e)}", ErrorCode.PINECONE_ERROR)
            else:
                raise ToolSearchError(f"Failed to upsert tools: {str(e)}", ErrorCode.BATCH_UPSERT_ERROR)
    
    def query_tools(self, request: ToolSearchRequest, namespace: str = DEFAULT_NAMESPACE) -> List[ToolSearchResponse]:
        """
        查询工具
        
        Args:
            request: 搜索请求
            namespace: 命名空间
            
        Returns:
            搜索结果列表
        """
        try:
            # 验证请求
            if not request.query and not request.filters:
                raise ToolSearchError("Either query or filters must be provided", ErrorCode.VALIDATION_ERROR)
            
            # 生成查询嵌入
            query_embedding = self.tool_embeddings.embed_query(request.query) if request.query else None
            
            # 构建过滤器
            pinecone_filter = self._build_pinecone_filter(request.filters or {})
            
            # 执行查询
            if query_embedding:
                query_response = self.tool_index.query(
                    vector=query_embedding,
                    top_k=request.top_k,
                    include_metadata=True,
                    filter=pinecone_filter if pinecone_filter else None,
                    namespace=namespace
                )
            else:
                # 仅过滤器查询
                import numpy as np
                random_vector = np.random.rand(self.embedding_dimension).tolist()
                query_response = self.tool_index.query(
                    vector=random_vector,
                    top_k=request.top_k,
                    include_metadata=True,
                    filter=pinecone_filter,
                    namespace=namespace
                )
            
            # 应用后处理过滤器
            matches = self._apply_post_filters(
                [{"metadata": match.metadata, "score": match.score} for match in query_response.matches],
                request.filters or {}
            )
            
            # 处理结果
            results = []
            for match_data in matches:
                metadata = match_data["metadata"]
                score = match_data["score"]
                
                # 解析参数
                parameters = parse_tool_parameters(metadata.get("parameters"))
                
                # 转换相似度分数
                similarity_score = self._convert_distance_to_similarity(score) if query_embedding else 1.0
                
                # 创建响应对象
                response = ToolSearchResponse(
                    tool_name=metadata.get("tool_name", ""),
                    action_id=metadata.get("action_id", 0),
                    toolkit_id=metadata.get("toolkit_id", 0),
                    description=metadata.get("description", ""),
                    parameters=parameters,
                    score=similarity_score
                )
                
                results.append(response)
            
            return results
            
        except ToolSearchError:
            raise
        except Exception as e:
            if "embedding" in str(e).lower():
                raise ToolSearchError(f"Failed to generate query embedding: {str(e)}", ErrorCode.EMBEDDING_ERROR)
            elif "pinecone" in str(e).lower():
                raise ToolSearchError(f"Pinecone query failed: {str(e)}", ErrorCode.PINECONE_ERROR)
            else:
                raise ToolSearchError(f"Failed to query tools: {str(e)}", ErrorCode.QUERY_ERROR)
    
    def delete_tool(self, action_id: int, namespace: str = DEFAULT_NAMESPACE) -> bool:
        """
        删除工具
        
        Args:
            action_id: 工具ID (修正：使用 action_id 而不是 toolkit_id)
            namespace: 命名空间
            
        Returns:
            是否成功删除
        """
        try:
            vector_id = str(action_id)
            self.tool_index.delete(ids=[vector_id], namespace=namespace)
            return True
            
        except Exception as e:
            raise ToolSearchError(f"Failed to delete tool: {str(e)}", ErrorCode.DELETE_ERROR)
    
    def delete_tools(self, action_ids: List[int], namespace: str = DEFAULT_NAMESPACE) -> List[str]:
        """
        批量删除工具
        
        Args:
            action_ids: 工具ID列表 (修正：使用 action_id 而不是 toolkit_id)
            namespace: 命名空间
            
        Returns:
            删除的向量ID列表
        """
        try:
            vector_ids = [str(action_id) for action_id in action_ids]
            self.tool_index.delete(ids=vector_ids, namespace=namespace)
            return vector_ids
            
        except Exception as e:
            raise ToolSearchError(f"Failed to delete tools: {str(e)}", ErrorCode.BATCH_DELETE_ERROR)
    
    def get_tool_index_stats(self) -> Dict[str, Any]:
        """获取工具索引统计信息"""
        try:
            return self.tool_index.describe_index_stats()
        except Exception as e:
            raise ToolSearchError(f"Failed to get tool index stats: {str(e)}", ErrorCode.STATS_ERROR)
    
    def get_tool_by_id(self, action_id: int, namespace: str = DEFAULT_NAMESPACE) -> Optional[Tool]:
        """
        根据ID获取工具
        
        Args:
            action_id: 工具ID
            namespace: 命名空间
            
        Returns:
            工具对象或None
        """
        try:
            if action_id <= 0:
                raise ToolSearchError("Invalid action_id", ErrorCode.VALIDATION_ERROR)
            
            vector_id = str(action_id)
            fetch_response = self.tool_index.fetch(ids=[vector_id], namespace=namespace)
            
            if vector_id in fetch_response.vectors:
                vector_data = fetch_response.vectors[vector_id]
                return metadata_to_tool(vector_data.metadata)
            
            return None
            
        except ToolSearchError:
            raise
        except Exception as e:
            raise ToolSearchError(f"Failed to get tool by ID: {str(e)}", ErrorCode.FETCH_ERROR)
    
    def health_check(self) -> Dict[str, Any]:
        """健康检查"""
        try:
            # 检查索引状态
            stats = self.get_tool_index_stats()
            
            # 检查嵌入服务
            test_embedding = self.tool_embeddings.embed_query("test")
            
            return {
                "status": "healthy",
                "index_name": self.index_name,
                "index_stats": stats,
                "embedding_dimension": len(test_embedding),
                "embedding_model": self.embedding_model,
                "timestamp": int(time.time() * 1000)  # 当前时间戳（毫秒）
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": int(time.time() * 1000)
            }


# 便利函数
def create_tool_search_provider(
    index_name: str = DEFAULT_INDEX_NAME,
    embedding_model: str = EMBEDDING_MODEL,
    embedding_dimension: int = EMBEDDING_DIMENSION
) -> ToolSearchProvider:
    """创建工具搜索提供者实例"""
    return ToolSearchProvider(
        index_name=index_name,
        embedding_model=embedding_model,
        embedding_dimension=embedding_dimension
    )


def load_tools_from_json(file_path: str) -> List[Tool]:
    """从JSON文件加载工具列表"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        tools = []
        for tool_data in data:
            # 构建参数列表
            parameters = []
            for param_data in tool_data.get("parameters", []):
                parameters.append(ToolParameter(**param_data))
            
            # 创建工具对象
            tool = Tool(
                action_id=tool_data.get("action_id", 0),
                toolkit_id=tool_data.get("toolkit_id", 0),
                tool_name=tool_data.get("tool_name", ""),
                description=tool_data.get("description", ""),
                parameters=parameters,
                toolkit=tool_data.get("toolkit", ""),
            )
            tools.append(tool)
        
        return tools
        
    except Exception as e:
        raise ToolSearchError(f"Failed to load tools from JSON: {str(e)}", ErrorCode.FILE_LOAD_ERROR)


def load_toolkit_from_json(file_path: str) -> Toolkit:
    """从JSON文件加载工具包"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 构建工具列表
        tools = []
        for tool_data in data.get("tools", []):
            # 构建参数列表
            parameters = []
            for param_data in tool_data.get("parameters", []):
                parameters.append(ToolParameter(**param_data))
            
            # 创建工具对象
            tool = Tool(
                action_id=tool_data.get("action_id", 0),
                toolkit_id=data.get("toolkit_id", 0),
                tool_name=tool_data.get("tool_name", ""),
                description=tool_data.get("description", ""),
                parameters=parameters,
                toolkit=data.get("name", "")
            )
            tools.append(tool)
        
        # 创建工具包对象
        toolkit = Toolkit(
            toolkit_id=data.get("toolkit_id", 0),
            name=data.get("name", ""),
            description=data.get("description", ""),
            tools=tools
        )
        
        return toolkit
        
    except Exception as e:
        raise ToolSearchError(f"Failed to load toolkit from JSON: {str(e)}", ErrorCode.FILE_LOAD_ERROR)


# 示例使用
if __name__ == "__main__":
    # 创建工具搜索提供者
    provider = create_tool_search_provider()
    
    # 示例工具包
    example_toolkit = Toolkit(
        toolkit_id=79,
        name="Pendle",
        description="Pendle Protocol toolkit for yield trading on EVM chains",
        tools=[
            Tool(
                action_id=1001,  # 使用唯一的工具ID
                toolkit_id=79,
                tool_name="addLiquidity",
                description="Provide liquidity to Pendle pools on EVM chains",
                parameters=[
                    ToolParameter(name="address", type="string", required=True),
                    ToolParameter(name="amount", type="number", required=True),
                    ToolParameter(name="chain", type="string", required=True),
                ],
                toolkit="Pendle"
            ),
            Tool(
                action_id=1002,  # 另一个唯一的工具ID
                toolkit_id=79,
                tool_name="removeLiquidity",
                description="Remove liquidity from Pendle pools",
                parameters=[
                    ToolParameter(name="address", type="string", required=True),
                    ToolParameter(name="amount", type="number", required=True),
                ],
                toolkit="Pendle"
            )
        ]
    )
    
    try:
        # 插入工具包
        vector_ids = provider.upsert_toolkit(example_toolkit)
        print(f"✅ Upserted toolkit with {len(vector_ids)} tools")
        
        # 查询工具
        search_request = ToolSearchRequest(
            query="add liquidity evm pool",
            top_k=5,
            filters={
                "chain": ["EVM"],
                "toolkit": ["Pendle"]
            }
        )
        
        results = provider.query_tools(search_request)
        print(f"✅ Found {len(results)} tools")
        for result in results:
            print(f"  - {result.tool_name} (score: {result.score})")
        
        toolkit_tools = provider.get_toolkit_tools(79)
        print(f"✅ Toolkit contains {len(toolkit_tools)} tools")
        
        # 健康检查
        health = provider.health_check()
        print(f"✅ Health status: {health['status']}")
        
    except ToolSearchError as e:
        print(f"❌ Tool search error [{e.error_code}]: {e.message}")
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
