import "./locale/i18n.js";
import "../js/parser.js";
import * as utB from "./util-book-reference.js";
import {writeJsonSync} from "5etools-utils/lib/UtilFs.js";

writeJsonSync("data/generated/bookref-quick.json", utB.UtilBookReference.getIndex({name: "快速参考 (5e/2014)", id: "bookref-quick", tag: "quickref"}), {isClean: true, isMinify: true});
console.log("已更新快速参考。");
