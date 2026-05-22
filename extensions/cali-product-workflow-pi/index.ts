/**
 * Pi Extension Stub for cali-product-workflow
 * 
 * This stub re-exports the extension from the main package's build output.
 * The main package (@renatocaliari/cali-product-workflow) provides the actual extension.
 * This stub allows pi to install and load the extension from npm.
 * 
 * Pattern: Dual-Install
 * - npm install @renatocaliari/cali-product-workflow → skills, adapters, CLI
 * - pi install npm:@renatocaliari/cali-pw-pi → Pi extension
 */
export { default } from "./index.js";