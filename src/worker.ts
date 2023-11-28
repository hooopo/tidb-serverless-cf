import { connect } from '@tidbcloud/serverless'
import process from 'process';

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
		
		const db_config = new URL(process.env.DATABASE_URL.replace('mysql://', 'http://'));
		const tenant_id = db_config.username.split('.')[0];

		// generate temp user and password for guest, not very secure, but it's not a problem.
		const guest_user = tenant_id + '.' + openai_conversation_id.split('-')[0];
		const guest_password = openai_conversation_id.split('-')[3];
    

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

		// setup guest user and database
		await conn.execute(`CREATE DATABASE IF NOT EXISTS ${db_name}`);
		await conn.execute(`CREATE USER IF NOT EXISTS '${guest_user}'@'%' IDENTIFIED BY '${guest_password}';`);
		await conn.execute(`GRANT ALL PRIVILEGES ON ${db_name}.* TO '${guest_user}'@'%';`);

		const guest_conn = connect({url:env.DATABASE_URL, database:db_name, username:guest_user, password:guest_password})

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
