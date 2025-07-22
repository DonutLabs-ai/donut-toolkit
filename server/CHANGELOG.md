# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2024-XX-XX

### 🎉 Major Changes

- **BREAKING**: Removed CDP API Key dependency - you can now use your own wallet service
- Added support for custom wallet providers that return unsigned transactions
- Added new `getMcpToolsFromProviders` function for read-only operations without wallet requirement

### ✨ New Features

- `UnsignedTransactionWalletProvider` - Example implementation for unsigned transaction handling
- `ExternalWalletServiceProvider` - Advanced example for external wallet service integration
- Support for multiple initialization methods:
  - Using custom wallet providers
  - Using action providers directly (read-only)
  - Using existing AgentKit instances
- Comprehensive examples for different usage patterns

### 📝 Documentation

- Updated README with new usage patterns and examples
- Added detailed guides for creating custom wallet providers
- Removed CDP API key setup instructions
- Added benefits section highlighting security and flexibility improvements

### 🔧 API Changes

- `getMcpTools()` now accepts either an `AgentKit` instance or `McpToolsConfig`
- Added `getMcpToolsFromProviders()` for direct action provider usage
- New configuration interface `McpToolsConfig` for custom wallet setup

### 🚀 Benefits

- **No External Dependencies**: Remove reliance on Coinbase Developer Platform
- **Enhanced Security**: Transactions remain unsigned until you sign them with your own service
- **Increased Flexibility**: Choose from multiple integration patterns
- **Better Scalability**: Support read-only operations without wallet requirements

## [0.2.0] - 2024-01-XX

### Added
- Initial MCP extension implementation
- Support for AgentKit action providers
- Basic CDP integration

## [0.1.0] - 2024-01-XX

### Added
- Initial release
- Basic MCP protocol support
