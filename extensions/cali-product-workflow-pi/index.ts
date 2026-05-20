/**
 * Pi Extension Stub for cali-product-workflow
 * 
 * This stub re-exports the extension from the main package's build output.
 * The main package (cali-product-workflow) provides the actual extension implementation.
 * This stub allows pi to install and load the extension from npm.
 * 
 * Pattern: Dual-Install (same as context-mode)
 * - npm install @renatocaliari/cali-product-workflow → CLI and skills available
 * - pi install npm:cali-product-workflow-pi → Extension loaded from this stub
 */

export { default } from "../cali-product-workflow/index.ts";