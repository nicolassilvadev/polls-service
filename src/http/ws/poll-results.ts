import { FastifyInstance } from "fastify";
import { voting } from "../../utils/voting-pub-sub";
import { z } from "zod";

export async function pollResults(app: FastifyInstance) {
  app.get('/polls/:pollId/results', { websocket: true }, (connection, req) => {
    connection.socket.on('message', (message: string) => {
      // Validate params
      const pollResultParams = z.object({
        pollId: z.string().uuid(),
      })
      // Get validated data
      const { pollId } = pollResultParams.parse(req.params);
      // Subscribe
      voting.subscribe(pollId, (message) => {
        connection.socket.send(JSON.stringify(message))
      })
    })
  })
}