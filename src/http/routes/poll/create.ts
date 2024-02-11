import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { FastifyInstance } from "fastify";

export async function createPoll(app: FastifyInstance) {
  app.post('/polls', async (req, res) => {
    // Validate payload
    const createPollBody = z.object({
      title: z.string(),
      options: z.array(z.string()),
    })
    // Get validated data
    const { title, options } = createPollBody.parse(req.body);
    // Persist data on db
    const poll = await prisma.poll.create({
      // Poll creation
      data: {
        title,
        // Create poll options at the same time, thats cool tho
        options: {
          createMany: {
            data: options.map((option) => {
              // We dont need to inform the pollId field, it will be there automaticly
              return { title: option }
            }),
          }
        }
      }
    })
    // Return
    return res.status(201).send({ pollId: poll.id })
  });
}