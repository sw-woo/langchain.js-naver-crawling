// 1. Import 라이브러리 및 패키지
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

import moment from "moment-timezone";

// 2. dotenv 환경변수 설정
dotenv.config();
// 3. 크롤링할 domain 주소와 query object 정의
const config = {
	domain: "https://news.naver.com/section/101",
	query: "경제 부분 기사만 요약해줘",
};
// 4.스텝 전역 변수 설정
let currentStep = 1;
const startTime = performance.now();
// 5. 스텝과 시간 출력 함수
function logTimeWriteOutStep(message) {
	const elapsedTime = `[${((performance.now() - startTime) / 1000).toFixed(2)}s]`;
	const logMessage = `${elapsedTime} Step ${currentStep}: ${message}`;
	console.log(logMessage);
	currentStep += 1;
}
//5-1. 현재 한국 시간 출력 함수
const getCurrentTime = () => {
	var m = moment().tz("Asia/Seoul");
	return m.format("YYYY-MM-DD HH:mm:ss");
};

console.log(getCurrentTime()); // 2022-08-04 00:01:40
//6. 비동기 main()함수 정의및 실행
async function main() {
	// 6. 비동기 main()함수 정의및 실행 logTimeWriteOutStep 시작
	logTimeWriteOutStep("main 함수 시작");

	// 7. OpenAI Embeddings 선언 및 할당
	const embeddings = new OpenAIEmbeddings({
		openAIApiKey: process.env.OPENAI_API_KEY,
		batchSize: 512,
	});

	logTimeWriteOutStep("OpenAI Embeddings 선언 및 할당 완료");
	// 8. config 객체로 정의한 doamin 속성을 axios를 이용하여서 도메인에서 html 파일 가져오기
	const response = await axios.get(config.domain);
	logTimeWriteOutStep("axios를 이용하여서 도메인에서 html 파일 가져오기 완료! ");

	// 9. 저장할 html 파일 위치 선언
	const cacheDir = path.join("/Users/usermackbookpro/Desktop/langcha.js-crawling", "cache");
	// 9. 최종 요약본 정리 파일 위치 선언
	const recordDir = path.join("/Users/usermackbookpro/Desktop/langcha.js-crawling", "record");

	// 10. 지정한 파일경로에 파일(디렉토리)가 존재하지 않는다면 파일(디렉토리) 생성
	if (!fs.existsSync(cacheDir)) {
		fs.mkdirSync(cacheDir);
	}
	if (!fs.existsSync(recordDir)) {
		fs.mkdirSync(recordDir);
	}

	logTimeWriteOutStep("cache/record 파일(디렉토리)생성 완료!");
	// 10. aixos로 받아온 response.html 파일로 저장
	const filePath = path.join(cacheDir, `${getCurrentTime()}-response.html`);
	fs.writeFileSync(filePath, response.data);
	logTimeWriteOutStep("aixos로 받아온 response.html 파일로 저장 완료!");
	// 11. 인터넷 상에서  CheerioWebBaseLoader 객체에 크롤링 주소의 html에 li 태그만 가져오는 부분
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

	logTimeWriteOutStep("HTML파일 로드 완료!");
	console.log(splitDocs);
	// 12. Load한 데이터를 전부 Document 객체 형식으로 변환 {pageContent: item.pageContent, metadata: item.metadata}
	let docs = splitDocs.map((item) => new Document({pageContent: item.pageContent, metadata: item.metadata}));
	// console.log(docs);
	logTimeWriteOutStep("모든 데이터를 Document 객체 형식으로 변환 완료");
	// 13. 임베딩을 사용하여서 전체 docs데이터를 벡터화하여 벡터 DB 생성
	const vectorStore = await HNSWLib.fromDocuments(docs, embeddings);
	logTimeWriteOutStep("Vector store created with embeddings");
	// 14. Set up QA Chain gpt-3.5-turbo or gpt-4 "
	const model = new ChatOpenAI({modelName: "gpt-4"});
	const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever(), {
		returnSourceDocuments: true,
	});
	logTimeWriteOutStep("model 과 Chain 셋팅 완료 요약 시작");
	// 15. Run QA Chain
	const resp = await chain.call({query: config.query});
	logTimeWriteOutStep(`QA Response:\n ${resp.text} `);

	const filePath2 = path.join(recordDir, `${getCurrentTime()}-record.txt`);
	fs.writeFileSync(filePath2, resp.text);
	logTimeWriteOutStep("요약 데이터 텍스타 파일 저장 완료");
	// 16. 최종 실행 시간 출력
	logTimeWriteOutStep("최종 실행 시간");
}
// 비동기 main 함수 호출
main();
