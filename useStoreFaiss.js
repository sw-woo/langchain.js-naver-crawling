import {config} from "dotenv";
config();
import {OpenAIEmbeddings} from "langchain/embeddings/openai";
import {OpenAI} from "langchain/llms/openai";
//vector store DB 에서 찾기위한 RetrievalQAChain 과 RetrievalQAChain을 돕기 위한 loadQAStuffChain
import {RetrievalQAChain, loadQAStuffChain} from "langchain/chains";
// 랭체인 텍스트데이터를 가져오는 Loader 선언
import {TextLoader} from "langchain/document_loaders/fs/text";
//랭체인 characterTextSplitter 선언
import {RecursiveCharacterTextSplitter} from "langchain/text_splitter";
//faissStore Facebook 메타에서 개발을 진행한 벡터 DB
import {FaissStore} from "langchain/vectorstores/faiss";
import {ChatOpenAI} from "@langchain/openai";
import moment from "moment-timezone";

import path from "path";
import fs from "fs";
import {PDFLoader} from "langchain/document_loaders/fs/pdf";

const getCurrentTime = () => {
	var m = moment().tz("Asia/Seoul");
	return m.format("YYYY-MM-DD HH:mm:ss");
};

const pdfDir = path.join("/Users/usermackbookpro/Desktop/langcha.js-crawling", "pdf");

// const timeFileName = `${getCurrentTime()}-save.pdf`;
//step1. 데이터 가져오기 ./ 경로에 텍스트 파일 집어 넣기

const pdf = "./pdf/2024-02-25 20:49:20-save.pdf";

const loader = new PDFLoader(pdf);

const docs = await loader.load();
const recordDir = path.join("/Users/usermackbookpro/Desktop/langcha.js-crawling", "record");

const query = "경제 기사내용을 요약해서 알려줘";
//step2. 문자데이터 split chunkSize 자르는 크기,chunkOverlap 자르는 부분에 공통영역 크기

const splitter = new RecursiveCharacterTextSplitter({
	chunkSize: 2000,
	chunkOverlap: 50,
});

const documents = await splitter.splitDocuments(docs);
console.log(documents);

//step3. 자른 문서데이터 임베딩 https://openai.com/blog/introducing-text-and-code-embeddings
const embeddings = new OpenAIEmbeddings({
	openAIApiKey: process.env.OPENAI_API_KEY,
	batchSize: 512,
});

//step4. 벡터DB FaissStore에 저장하기
const vectorstore = await FaissStore.fromDocuments(documents, embeddings);
await vectorstore.save("./");

const Fvectorstore = await FaissStore.load("./", embeddings);

const model = new ChatOpenAI({modelName: "gpt-4"});
const chain = RetrievalQAChain.fromLLM(model, Fvectorstore.asRetriever(), {
	returnSourceDocuments: true,
});
const resp = await chain.call({query: query});
console.log(`QA Response:\n ${resp.text} `);
const filePath = path.join(recordDir, `${getCurrentTime()}-response.txt`);
fs.writeFileSync(filePath, resp.text);
