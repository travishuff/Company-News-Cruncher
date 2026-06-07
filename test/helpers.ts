import type { Request, RequestHandler, Response } from 'express';

interface ControllerResult<TBody> {
  body: TBody;
  status: number;
}

export function invokeController<TBody = unknown>(
  controller: RequestHandler,
  body: Record<string, string>,
): Promise<ControllerResult<TBody>> {
  return new Promise(resolve => {
    const response = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        resolve({
          body: payload as TBody,
          status: this.statusCode,
        });
      },
    } as Partial<Response> & { statusCode: number };

    controller({ body } as Request, response as Response, () => undefined);
  });
}
