import { z } from "zod";

// Base schema for HTTP requests
const BaseHttpRequestSchema = z.object({
  url: z.string().url().describe("The URL of the API endpoint (can be localhost for development)"),
  method: z
    .enum(["GET", "POST", "PUT", "DELETE", "PATCH"])
    .nullable()
    .default("GET")
    .describe("The HTTP method to use for the request"),
  headers: z
    .record(z.string())
    .optional()
    .nullable()
    .describe("Optional headers to include in the request"),
  body: z.any().optional().nullable().describe("Optional request body for POST/PUT/PATCH requests"),
});

// Schema for initial HTTP request
export const HttpRequestSchema = BaseHttpRequestSchema.strip().describe(
  "Instructions for making a basic HTTP request",
);

