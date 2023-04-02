import { CommandManager } from "../modules/command-manager";

process.chdir("../");
const commandManager = new CommandManager();
commandManager.registerGlobalCommands();
