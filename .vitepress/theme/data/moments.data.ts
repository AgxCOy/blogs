import { readFileSync } from "fs";
import path from "path";
import { defineLoader } from "vitepress";
import * as YAML from 'yaml'

export interface Moment {
  fileName: string;
  date: string;
  time: string;
  content: string;
  image?: string;
  negative?: boolean;
}

let data: Moment[];

export { data };

export default defineLoader({
  watch: "public/data/moments/*.yaml",
  load(files) {
    return files
      .map((file) => {
        const fileName = path.basename(file);
        const content = YAML.parse(readFileSync(file, "utf-8"));
        return { fileName, ...content };
      })
      .sort(
        (a, b) =>
          Date.parse(`${b.date} ${b.time}`) - Date.parse(`${a.date} ${a.time}`),
      );
  },
});
