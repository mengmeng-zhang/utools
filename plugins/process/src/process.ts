import { Plugin, IListItem, ListItem } from "utools-helper";
import psList = require("ps-list");
import { platform } from "process";
const fileIcon = require("file-icon");

export interface IProcess {
  processes(): Promise<psList.ProcessDescriptor[]> | psList.ProcessDescriptor[];
  findIcon?(pid: number): Promise<string> | string;
}

class BaseProcess implements IProcess {
  async processes(): Promise<psList.ProcessDescriptor[]> {
    return await psList();
  }
}

export class Process implements Plugin {
  code = "ps";
  process: IProcess;

  constructor(process: IProcess) {
    this.process = process;
  }

  async enter(): Promise<IListItem[]> {
    return this.search("");
  }

  async search(word: string): Promise<IListItem[]> {
    let processes = await this.process.processes();

    let words = word.toLowerCase().split(/\s+/g);
    words.forEach((w) => {
      processes = processes.filter((p) => p.name.toLowerCase().includes(w));
    });
    processes = processes.sort((a, b) => -a.cpu + b.cpu).slice(1, 20);

    return await Promise.all(
      processes.map(
        async (p): Promise<IListItem> => {
          return {
            title: p.name,
            description: `cpu: ${p.cpu}%, mem: ${p.memory}, cmd: ${p.cmd}`,
            icon: await this.getIcon(p.name, p.ppid == 1 ? p.pid : p.ppid),
            data: p,
          };
        }
      )
    );
  }

  async getIcon(name: string, pid: number): Promise<string> {
    let icon = localStorage.getItem(name);
    if (icon) return icon;
    try {
      icon = await this.process.findIcon(pid);
    } catch (error) {
      console.log(error);
      icon = "system.png";
    }
    localStorage.setItem(name, icon);
  }

  select(item: IListItem) {
    process.kill(item.data.pid);
  }
}
