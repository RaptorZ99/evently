declare module 'swagger-ui-express' {
  import { RequestHandler } from 'express';
  const swaggerUi: {
    serve: RequestHandler;
    setup: (document: any, options?: any, customCss?: string, customfavIcon?: string, swaggerUrl?: string, customSiteTitle?: string) => RequestHandler;
  };
  export default swaggerUi;
}

