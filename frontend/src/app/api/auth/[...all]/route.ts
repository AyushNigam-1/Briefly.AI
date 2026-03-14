import { auth } from "@/app/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// This magically handles all GET and POST requests for authentication
export const { GET, POST } = toNextJsHandler(auth);