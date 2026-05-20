/**
 * Command Adapters Index
 * 
 * Exports all command-related functionality.
 */

export {
  // Dispatcher
  type CommandDescriptor,
  type CommandRegistrationSystem,
  WORKFLOW_COMMANDS,
  getCommandSystem,
  installCommandFiles,
  getAliasCommands,
} from "./dispatcher";