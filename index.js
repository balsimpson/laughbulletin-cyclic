const https = require('https');
const express = require('express');
const path = require('path');
const fs = require('fs');
const querystring = require('querystring');

const { Configuration, OpenAIApi } = require('openai');
const OPENAI_KEY = process.env.OPENAI_KEY;

const systemPrompt = "You are InstaIntern and your job is to help the user craft engaging, creative Instagram posts. You will output at least 3 options and they should be in this format - Content: The content of the post, Image: suggested image for the post, Hashtags: suggested hashtags for the post."

const configuration = new Configuration({
	apiKey: OPENAI_KEY,
});

const openai = new OpenAIApi(configuration);

const app = express();
app.use(express.json());


async function getChatCompletion(prompt) {
	// let model = "text-davinci-003"
	try {
		const prediction = await openai.createChatCompletion({
			// model: "gpt-3.5-turbo",
			model: "gpt-4",
			messages: [{
				role: "user",
				content: prompt
			}],
			max_tokens: 300
		});

		return prediction.data.choices[0].message.content
	} catch (error) {
		console.log("Failed to get completion - ", error.message)
		return error
	}
}

async function getData(url) {
	console.log("getDataURL", url);
	let res = await fetch(`${url}.json`);
	let data = await res.json();

	// @ts-ignore
	let post = data[0];
	// @ts-ignore
	let topcomments = getComments(data[1].data.children);

	// let subreddit = post.data.children[0].data.subreddit;
	// @ts-ignore
	let txt = await getNews(post.data.children[0].data.url);

	return {
		post,
		topcomments,
		txt,
	};
}

const getComments = (comments) => {
	let txtLen = 0;
	// Loop through the comments and extract necessary information
	const top_comments = [];
	comments.forEach(
		(comment) => {
			const author = comment.data.author;
			const text = comment.data.body;
			const time = new Date(comment.data.created_utc * 1000);
			const score = comment.data.score;
			const ups = comment.data.ups;
			const replies = comment.data.replies
				? comment.data.replies.data.children
				: [];

			// if (text) {
			txtLen += text?.length || 0;
			// }

			if (score >= 100) {
				// Only consider comments with a score of 100 or more
				const top_replies = [];
				replies.forEach(
					(reply) => {
						const reply_author = reply.data.author;
						const reply_text = reply.data.body;
						const reply_time = new Date(reply.data.created_utc * 1000);
						const reply_score = reply.data.score;

						if (reply_score >= 50) {
							// Only consider replies with a score of 50 or more
							top_replies.push({
								reply_author,
								reply_text,
								reply_time,
								reply_score,
							});
						}
					}
				);

				top_comments.push({ author, text, time, score, top_replies });
			}
		}
	);

	// Sort the top comments by score
	top_comments.sort((a, b) => b.score - a.score);
	const top_10_comments = top_comments.slice(0, 10);

	// console.log(txtLen, top_10_comments);
	// @ts-ignore
	const commentsTxt = getTopComments(top_10_comments);
	return commentsTxt;
};

const getTopComments = (comments) => {
	const comment_strings = [];
	let total_length = 0;
	comments.forEach((comment) => {
		const author = comment.author;
		const text = comment.text;

		// Format the comment as "authorName: Comment"
		const formatted_comment = `${author}: ${text}`;

		// Only consider comments that won't exceed the maximum length
		if (total_length + formatted_comment.length <= 2000) {
			comment_strings.push(formatted_comment);
			total_length += formatted_comment.length;
		} else {
			return;
		}
	});

	// Combine the comment strings into a single string, separated by commas
	const output_string = comment_strings.join(", ");

	// console.log(output_string);
	return output_string;
};

const getNews = async (url) => {
	const res = await fetch(
		`https://laughbullet.vercel.app/api/unfluff?url=${encodeURIComponent(url)}`
	);
	// console.log("unfluffed", data.value);
	let data = await res.json();
	return data;
};

app.post('/link', async (req, res) => {

	try {
		const body = req.body;

		let { post, topcomments, txt } = await getData(body.url.split("?")[0]);
		return { post, topcomments, txt }
	} catch (error) {
		console.log(error)
	}

	// res.send('Yo!')
	res.sendStatus(200);
});

app.get('/link', async (req, res) => {

	try {
		const body = req.body;

		let { post, topcomments, txt } = await getData(body.url.split("?")[0]);
		return { post, topcomments, txt }
	} catch (error) {
		console.log(error)
	}

	// res.send('Yo!')
	res.sendStatus(200);
});

app.listen(3000, () => {
	console.log('Server listening on port 3000');
});