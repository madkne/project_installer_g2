import * as LOG from "@dat/lib/log";
import * as ARG from "@dat/lib/argvs";
import * as IN from "@dat/lib/input";
import * as ENV from "@dat/lib/env";
import * as OS from "@dat/lib/os";
import * as TEM from "@dat/lib/template";
import * as SET from "@dat/lib/settings";
import * as path from 'path';
import * as fs from 'fs';
import { InstallCommand } from "./src/commands/install";
import { loadAllConfig } from "./src/common";
import { StopCommand } from "./src/commands/stop";

/************************************* */
const VERSION = '0.57';

/************************************* */
export async function main(): Promise<number> {
   LOG.clear();
   let configs = await loadAllConfig();
   LOG.success(`*** ${configs.project_name} Installer - version ${VERSION} ***`);
   await SET.showStatistics();

   await ARG.cli();
   InstallCommand
   StopCommand


   return 0;
}
/************************************* */
/************************************* */
