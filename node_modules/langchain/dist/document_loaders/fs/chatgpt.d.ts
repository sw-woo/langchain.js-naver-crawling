import { TextLoader } from "./text.js";
import { Document } from "../../document.js";
export declare class ChatGPTLoader extends TextLoader {
    numLogs: number;
    constructor(filePathOrBlob: string | Blob, numLogs?: number);
    protected parse(raw: string): Promise<string[]>;
    load(): Promise<Document[]>;
}
