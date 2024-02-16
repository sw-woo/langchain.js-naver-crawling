// 1. Import dependencies
import axios from "axios";
import {CheerioWebBaseLoader} from "langchain/document_loaders/web/cheerio";
import {OpenAIEmbeddings} from "@langchain/openai";
import {HNSWLib} from "@langchain/community/vectorstores/hnswlib";
import {Document} from "@langchain/core/documents";
import {RetrievalQAChain} from "langchain/chains";
import {ChatOpenAI} from "@langchain/openai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import {RecursiveCharacterTextSplitter} from "langchain/text_splitter";

// 2. Load environment variables
dotenv.config();
// 3. Configuration object
const config = {
	domain: "https://news.naver.com/section/101",
	query: "경제 부분 기사만 요약해줘",
};
// 4. Initialize global variables
let currentStep = 1;
const startTime = performance.now();
// 5. Helper function to log messages with elapsed time and write out response
function logTimeWriteOutStep(message, response = null) {
	const elapsedTime = `[${((performance.now() - startTime) / 1000).toFixed(2)}s]`;
	const logMessage = `${elapsedTime} Step ${currentStep}: ${message}`;
	console.log(logMessage);
	response ? console.log(response) : null;
	currentStep += 1;
}
async function main() {
	// 6. Starting the main function
	logTimeWriteOutStep("Starting main function");
	// 7. Initialize OpenAI Embeddings
	const embeddings = new OpenAIEmbeddings({
		openAIApiKey: process.env.OPENAI_API_KEY,
		batchSize: 512,
	});
	logTimeWriteOutStep("OpenAI Embeddings initialized");
	// 8. Perform a GET request to the specified domain
	const response = await axios.get(config.domain);
	logTimeWriteOutStep("GET request to Hacker News completed");
	// 9. Check and create cache directory
	const cacheDir = path.join("/Users/usermackbookpro/Desktop/Getting-Started-with-Langchain.JS-and-Unstructured.IO-main", "cache");
	if (!fs.existsSync(cacheDir)) {
		fs.mkdirSync(cacheDir);
	}
	logTimeWriteOutStep("Cache directory checked/created");
	// 10. Save response data as an HTML file
	const filePath = path.join(cacheDir, "response.html");
	fs.writeFileSync(filePath, response.data);
	logTimeWriteOutStep("Response data saved as HTML file");
	// 11. Load HTML file using CheerioWebBaseLoader
	const loader = new CheerioWebBaseLoader(config.domain, {
		selector: "li",
	});
	let loadedData = await loader.load();

	//11-1. 한번에 많은 데이터 요청을 방지 하기위해서 스크래핑한 데이터 사이즈 조절과 임베딩을 위한 겹치는 부분설정
	const splitter = new RecursiveCharacterTextSplitter({
		chunkSize: 2000,
		chunkOverlap: 100,
	});

	const splitDocs = await splitter.splitDocuments(loadedData);

	logTimeWriteOutStep("HTML file loaded");
	console.log(splitDocs);
	// 12. Convert loaded data into Document objects
	let docs = splitDocs.map((item) => new Document({pageContent: item.pageContent, metadata: item.metadata}));
	console.log(docs);
	logTimeWriteOutStep("Loaded data converted into Document objects");
	// 13. Generate embeddings and create a vector store
	const vectorStore = await HNSWLib.fromDocuments(docs, embeddings);
	logTimeWriteOutStep("Vector store created with embeddings");
	// 14. Set up QA Chain gpt-3.5-turbo or gpt-4 "
	const model = new ChatOpenAI({modelName: "gpt-4"});
	const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever(), {
		returnSourceDocuments: true,
	});
	logTimeWriteOutStep("QA Chain set up");
	// 15. Run QA Chain
	const resp = await chain.call({query: config.query});
	logTimeWriteOutStep("QA Response", resp.text);
	// 16. End timing the execution
	logTimeWriteOutStep("Execution timing ended");
}
// 17. Run Main Function
main();
