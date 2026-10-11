import { Jieba } from "@node-rs/jieba";
import { dict } from "@node-rs/jieba/dict.js";

// PG 的 simple 分词器不切中文,先用 jieba 切好、空格拼接再交给 to_tsvector(04 §4.4)
const jieba = Jieba.withDict(dict);

const join = (tokens: string[]) =>
  tokens
    .map((t) => t.trim())
    .filter(Boolean)
    .join(" ");

/** 建索引:搜索引擎模式,切得更细,「天气预报」同时产出「天气」「预报」「天气预报」 */
export const segmentForIndex = (text: string): string => join(jieba.cutForSearch(text, true));

/** 查询:普通模式,产出的词都包含在索引的切分结果里 */
export const segmentForQuery = (text: string): string => join(jieba.cut(text, true));
