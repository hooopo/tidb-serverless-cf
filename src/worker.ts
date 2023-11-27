import { connect } from '@tidbcloud/serverless'

export interface Env {
	DATABASE_URL: string;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url)
		const pathname = url.pathname
		const search = url.searchParams
		const openai_conversation_id = request.headers.get('openai-conversation-id') || '00000000-0000-0000-0000-000000000000';
		const db_name = "db" + openai_conversation_id.replace(/-/g, '');
		
		if (url.pathname === '/') {
			// HTML content
			const htmlContent = `<!DOCTYPE html>
	<html>
	<head>
			<title>Welcome</title>
	</head>
	<body>
			<h1>Welcome to My Website</h1>
			<p>This is the home page served by Cloudflare Workers.</p>
	</body>
	</html>`;
	
			return new Response(htmlContent, {
				headers: {
					'content-type': 'text/html;charset=UTF-8',
				},
			})
		}

		const json_data = await request.json();
		console.log(json_data);

		const conn = connect({url:env.DATABASE_URL})

		// create db if not exist
		await conn.execute(`CREATE DATABASE IF NOT EXISTS ${db_name}`);

		const guest_conn = connect({url:env.DATABASE_URL, database:db_name})

		let query = ''
		let resp
		switch (pathname) {
			case '/api/query':
				query = json_data.query;
				resp = await guest_conn.execute(query);
				break;
			case '/api/total_order_per_year':
				query = 'SELECT 1'
				resp = await guest_conn.execute(query)
		}

		let response
		if (query != '') {
			response = new Response(JSON.stringify(resp))
		}else{
			response = new Response('Not Found', {status: 404})
		}
		response.headers.set("Access-Control-Allow-Origin", "*")
		response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		return response
	},
};
