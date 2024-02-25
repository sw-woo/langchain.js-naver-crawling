import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";
import moment from "moment-timezone";
import sleep from "sleep-promise";
import {PDFLoader} from "langchain/document_loaders/fs/pdf";
import {OpenAIEmbeddings} from "@langchain/openai";
import dotenv from "dotenv";

dotenv.config();

// 퍼펫터를 사용하여 pdf파일로 크롤링하는 부분
async function generatePDF(url, outputPath) {
	const browser = await puppeteer.launch({headless: "shell"});
	const page = await browser.newPage();
	await page.goto(url);
	await page.pdf({path: outputPath, format: "A4"});
	await browser.close();
}

const getCurrentTime = () => {
	var m = moment().tz("Asia/Seoul");
	return m.format("YYYY-MM-DD HH:mm:ss");
};

// 9. 저장할 html 파일 위치 선언
const url = "https://news.naver.com/section/101";

const pdfDir = path.join("/Users/usermackbookpro/Desktop/langcha.js-crawling", "pdf");

const timeFileName = `${getCurrentTime()}-save.pdf`;

const embeddings = new OpenAIEmbeddings({
	openAIApiKey: process.env.OPENAI_API_KEY,
	batchSize: 512,
});

if (!fs.existsSync(pdfDir)) {
	fs.mkdirSync(pdfDir);
}

// PDF 생성
generatePDF(url, `${pdfDir}/${timeFileName}`)
	.then(() => console.log("PDF generated successfully"))
	.catch((err) => console.error("Error generating PDF:", err));

const docs = sleep(3000).then(() => {
	const loader = new PDFLoader(`${pdfDir}/${timeFileName}`);
	const docs = loader.load();
	return docs;
});

console.log(`pdf loader 확인부분${docs}`);
