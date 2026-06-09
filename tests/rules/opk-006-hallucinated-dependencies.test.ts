import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
const https = require('https');
import rule from '../../src/rules/opk-006-hallucinated-dependencies';

const FIXTURES_DIR = path.resolve(__dirname, '..', '..', '..', 'tests', 'fixtures', 'hallucinated-dependencies');

const originalRequest = https.request;

function mockHttpsRequest(mockResponses: Record<string, { statusCode: number } | Error>) {
  // @ts-ignore - basic mock for testing
  (https as any).request = (url: string | URL, options: any, callback?: any) => {
    let cb = callback;
    if (typeof options === 'function') {
      cb = options;
    }
    
    const urlStr = url.toString();
    const pkgNameMatch = urlStr.match(/registry\.npmjs\.org\/(.+)$/);
    const pkgName = pkgNameMatch ? decodeURIComponent(pkgNameMatch[1]) : '';
    
    const responseConfig = mockResponses[pkgName] || { statusCode: 200 };
    
    const req = {
      on: (event: string, handler: any) => {
        if (event === 'error' && responseConfig instanceof Error) {
          setTimeout(() => handler(responseConfig), 0);
        }
      },
      end: () => {
        if (!(responseConfig instanceof Error) && cb) {
          setTimeout(() => cb({ statusCode: (responseConfig as any).statusCode }), 0);
        }
      },
      destroy: () => {}
    };
    return req as any;
  };
}

test('OPK-006: Hallucinated Dependencies', async (t) => {
  t.afterEach(() => {
    (https as any).request = originalRequest;
  });

  await t.test('should flag packages that return 404 from npm registry', async () => {
    mockHttpsRequest({
      'react': { statusCode: 200 },
      'this-package-definitely-does-not-exist-12345': { statusCode: 404 },
      '@myorg/fake-scoped-pkg': { statusCode: 404 },
      'fake-dev-dep-999': { statusCode: 404 },
    });

    const findings = await rule.check({
      rootDir: FIXTURES_DIR,
      files: ['package.json'],
    });

    assert.strictEqual(findings.length, 3);
    
    const messages = findings.map(f => f.message);
    assert.ok(messages.some(m => m.includes('this-package-definitely-does-not-exist-12345')));
    assert.ok(messages.some(m => m.includes('@myorg/fake-scoped-pkg')));
    assert.ok(messages.some(m => m.includes('fake-dev-dep-999')));
    assert.ok(!messages.some(m => m.includes('react')));
    assert.ok(!messages.some(m => m.includes('file-dependency')));
  });

  await t.test('should ignore packages on network errors (fail open)', async () => {
    mockHttpsRequest({
      'react': { statusCode: 200 },
      'this-package-definitely-does-not-exist-12345': new Error('Network offline'),
      '@myorg/fake-scoped-pkg': { statusCode: 500 }, // Server error, should be ignored
      'fake-dev-dep-999': { statusCode: 429 }, // Rate limit, should be ignored
    });

    const findings = await rule.check({
      rootDir: FIXTURES_DIR,
      files: ['package.json'],
    });

    // None should be flagged because 404 is the only condition for flagging
    assert.strictEqual(findings.length, 0);
  });

  await t.test('should have correct rule metadata', () => {
    assert.strictEqual(rule.id, 'OPK-006');
    assert.strictEqual(rule.name, 'Hallucinated Dependencies');
    assert.strictEqual(rule.severity, 'error');
  });
});
