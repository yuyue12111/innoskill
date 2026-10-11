import type { Logger } from "pino";
import type { Clock } from "../ports/clock.js";
import type { ObjectStorage } from "../ports/objectStorage.js";
import type { Database } from "../ports/repositories.js";
import type { SearchIndex } from "../ports/searchIndex.js";

export interface Deps {
  db: Database;
  storage: ObjectStorage;
  searchIndex: SearchIndex;
  clock: Clock;
  logger: Logger;
}
