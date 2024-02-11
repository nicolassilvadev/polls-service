import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { FastifyInstance } from "fastify";
import { redis } from "../../../lib/redis";

export async function getPoll(app: FastifyInstance) {
  app.get('/polls/:pollId', async (req, res) => {
    // Validate payload
    const getPollParams = z.object({
      pollId: z.string().uuid(),
    })
    // Get validated data
    const { pollId } = getPollParams.parse(req.params);
    // Get data on db
    const poll = await prisma.poll.findUnique({
      where: {
        id: pollId,
      },
      include: {
        options: {
          select: {
            id: true,
            title: true,
          }
        }
      }
    })
    // If not found
    if (!poll) {
      return res.status(404).send({ message: 'Poll not found!' })
    }
    // Get votes from redis
    const result = await redis.zrange(pollId, 0, -1, 'WITHSCORES')
    // Parse score data
    // Redis return something like this: ['POLL_ID', 'SCORE', 'POLL_ID_2', 'SCORE_2'...]
    // The reduce() below just convert that to an object
    const votes = result.reduce((finalObj, currentArrayElement, idx) => {
      if (idx % 2 === 0) {
        const score = result[idx + 1]
        Object.assign(finalObj, { [currentArrayElement]: Number(score) })
      }
      return finalObj
    }, {} as Record<string, number>)
    // Return
    return res.status(200).send({
      poll: {
        id: poll.id,
        title: poll.title,
        options: poll.options.map((option) => {
          return {
            id: option.id,
            title: option.title,
            score: votes[option.id] || 0
          }
        })
      }
    })
  });
}