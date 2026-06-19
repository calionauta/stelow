/**
 * Pi Extension Stub for stelow
 * 
 * This stub re-exports the extension from the main package's build output.
 * The main package (@renatocaliari/stelow) provides the actual extension.
 * This stub allows pi to install and load the extension from npm.
 * 
 * Pattern: Dual-Install
 * - npm install @renatocaliari/stelow → skills, adapters, CLI
 * - pi install npm:@renatocaliari/stelow-pi → Pi extension
 */
export { default } from "../stelow/index.js";