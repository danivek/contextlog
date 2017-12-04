const { expect } = require('chai');
const httpMocks = require('node-mocks-http');
const Contextlog = require('../../');
const pkg = require('../../package');

describe('Contextlog', () => {
  describe('mask', () => {
    it('should mask value', (done) => {
      const contextlog = new Contextlog();
      const masked = contextlog.mask('password');
      expect(masked).to.eql('********');
      done();
    });

    it('should not throw error on undefined value', (done) => {
      const contextlog = new Contextlog();
      const masked = contextlog.mask();
      expect(masked).to.be.undefined; // eslint-disable-line no-unused-expressions
      done();
    });
  });

  describe('maskUrl', () => {
    it('should mask url parameters', (done) => {
      const contextlog = new Contextlog({
        maskUrlParams: ['mask'],
      });
      const maskedUrl = contextlog.maskUrl('/path/to/endpoint?x-api-key=shouldbemask&mask=shouldbemask&test=shouldnotbemask');
      expect(maskedUrl).to.eql('/path/to/endpoint?x-api-key=************&mask=************&test=shouldnotbemask');
      done();
    });
  });

  describe('maskAuthorizationHeader', () => {
    it('should mask authorization header', (done) => {
      const contextlog = new Contextlog();
      const maskedAuthorization = contextlog.maskAuthorizationHeader('authorization');
      expect(maskedAuthorization).to.eql('*************');
      const maskedBasicAuthorization = contextlog.maskAuthorizationHeader('Basic YWRtaW46YWRtaW4=');
      expect(maskedBasicAuthorization).to.eql('Basic ****************');
      const maskedBearerAuthorization = contextlog.maskAuthorizationHeader('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ=');
      expect(maskedBearerAuthorization).to.eql('Bearer ******************************************************************************************************************************************************');
      done();
    });
  });

  describe('maskHeaders', () => {
    it('should mask header', (done) => {
      const contextlog = new Contextlog({
        maskHeaders: ['mask'],
      });
      const maskedHeaders = contextlog.maskHeaders({
        authorization: 'authorization',
        mask: 'mask',
        notmask: 'notmask',
      });
      expect(maskedHeaders).to.eql({
        authorization: '*************',
        mask: '****',
        notmask: 'notmask',
      });
      done();
    });
  });

  describe('getRequestResponseInfo', () => {
    it('should get request/response context', (done) => {
      const contextlog = new Contextlog({
        reqBody: (body) => {
          body.password = contextlog.mask(body.password);
          return body;
        },
        resBody: (body) => {
          if (body.password) body.password = context.mask(body.password);
          return body;
        },
      });
      const req = httpMocks.createRequest({
        method: 'POST',
        url: '/path/to/endpoint',
        headers: {
          host: 'localhost',
          connection: 'keep-alive',
        },
        body: {
          data: 'data',
          password: 'password',
        },
      });
      req.httpVersion = '1.1';
      req.ip = '0.0.0.0';
      const res = httpMocks.createResponse();
      res.statusCode = '200';
      res._headers = {
        'content-type': 'application/json; charset=utf-8',
      };
      res.body = {
        data: 'data',
      };

      const reqResContext = contextlog.getRequestResponseInfo(req, res);
      expect(reqResContext).to.have.eql({
        req: {
          httpVersion: '1.1',
          remoteAddress: '0.0.0.0',
          url: '/path/to/endpoint',
          method: 'POST',
          headers: {
            host: 'localhost',
            connection: 'keep-alive',
          },
          body: {
            data: 'data',
            password: '********',
          },
        },
        res: {
          statusCode: '200',
          body: {
            data: 'data',
          },
          headers: {
            'content-type': 'application/json; charset=utf-8',
          },
        },
      });
      done();
    });

    it('should get request/response context with untouched body', (done) => {
      const contextlog = new Contextlog({
        reqBody: true,
        resBody: true,
      });
      const req = httpMocks.createRequest({
        method: 'POST',
        url: '/path/to/endpoint',
        headers: {
          host: 'localhost',
          connection: 'keep-alive',
        },
        body: {
          data: 'data',
          password: 'password',
        },
      });
      req.httpVersion = '1.1';
      req.ip = '0.0.0.0';
      const res = httpMocks.createResponse();
      res.statusCode = '200';
      res._headers = {
        'content-type': 'application/json; charset=utf-8',
      };
      res.body = {
        data: 'data',
      };

      const reqResContext = contextlog.getRequestResponseInfo(req, res);
      expect(reqResContext).to.have.eql({
        req: {
          httpVersion: '1.1',
          remoteAddress: '0.0.0.0',
          url: '/path/to/endpoint',
          method: 'POST',
          headers: {
            host: 'localhost',
            connection: 'keep-alive',
          },
          body: {
            data: 'data',
            password: 'password',
          },
        },
        res: {
          statusCode: '200',
          body: {
            data: 'data',
          },
          headers: {
            'content-type': 'application/json; charset=utf-8',
          },
        },
      });
      done();
    });
  });

  describe('standard', () => {
    it('should return standard context with options', (done) => {
      const contextlog = new Contextlog({
        application: { name: pkg.name, version: '1.0.0' },
        user: ({ req }) => ({ id: req.user.id }),
        resource: ({ req }) => ({ type: req.params.type, id: req.params.id }),
        custom: ({ req }) => ({ custom: req.custom }),
      });
      const req = httpMocks.createRequest();
      const res = httpMocks.createResponse();

      req.user = { id: 'john.doe' };
      req.params = { type: 'blog', id: '1' };
      req.custom = 'custom';

      const context = contextlog.standard({ req, res });

      expect(context).to.have.property('date');
      expect(context).to.have.property('application').to.eql({ name: 'contextlog', version: '1.0.0' });
      expect(context).to.have.property('user').to.eql({ id: 'john.doe' });
      expect(context).to.have.property('resource').to.eql({ type: 'blog', id: '1' });
      expect(context).to.have.property('custom').to.eql('custom');
      done();
    });
  });

  describe('request', () => {
    it('should return request context with skipUrl options', (done) => {
      const contextlog = new Contextlog({
        skipUrls: [/\/skip/],
      });
      const req = httpMocks.createRequest({
        url: '/path/to/skip',
      });
      const res = httpMocks.createResponse();

      const context = contextlog.request({ req, res });

      expect(context).to.be.undefined; // eslint-disable-line no-unused-expressions
      done();
    });

    it('should return request context with parseUserAgent options', (done) => {
      const contextlog = new Contextlog({
        parseUserAgent: true,
      });
      const req = httpMocks.createRequest({
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36',
        },
      });
      const res = httpMocks.createResponse();

      const context = contextlog.request({ req, res });

      expect(context).to.have.property('date');
      expect(context).to.have.property('req');
      expect(context.req.userAgent).to.have.property('device');
      expect(context.req.userAgent).to.have.property('os');
      expect(context.req.userAgent).to.have.property('family').to.eql('Chrome');
      done();
    });
  });

  describe('error', () => {
    it('should return error context', (done) => {
      const contextlog = new Contextlog();
      const req = httpMocks.createRequest();
      const res = httpMocks.createResponse();

      const err = new Error('boom');
      const context = contextlog.error(err, { req, res });
      expect(context).to.have.property('date');

      expect(context).to.have.property('req');
      expect(context).to.have.property('res');

      expect(context).to.have.property('error').to.eql(true);
      expect(context).to.have.property('message').to.eql('boom');
      expect(context).to.have.property('stack');
      // Os metadata
      expect(context).to.have.property('os');
      expect(context.os).to.have.property('hostname');
      expect(context.os).to.have.property('plateform');
      expect(context.os).to.have.property('loadavg');
      expect(context.os).to.have.property('uptime');
      expect(context.os).to.have.property('freemem');
      // Process metadata
      expect(context).to.have.property('process');
      expect(context.process).to.have.property('pid');
      expect(context.process).to.have.property('uid');
      expect(context.process).to.have.property('gid');
      expect(context.process).to.have.property('cwd');
      expect(context.process).to.have.property('execPath');
      expect(context.process).to.have.property('version');
      expect(context.process).to.have.property('argv');
      expect(context.process).to.have.property('memoryUsage');

      done();
    });
  });
});
