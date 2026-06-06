export function invokeController(controller, body) {
  return new Promise(resolve => {
    const response = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({
          body: payload,
          status: this.statusCode,
        });
      },
    };

    controller({ body }, response);
  });
}
