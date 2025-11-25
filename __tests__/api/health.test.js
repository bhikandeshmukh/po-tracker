// __tests__/api/health.test.js
import handler from '../../pages/api/health';

describe('/api/health', () => {
    let req, res;

    beforeEach(() => {
        req = {
            method: 'GET',
            url: '/api/health'
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    it('should return 200 and healthy status', async () => {
        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                status: 'healthy'
            })
        );
    });

    it('should return 405 for non-GET requests', async () => {
        req.method = 'POST';

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(405);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    code: 'METHOD_NOT_ALLOWED'
                })
            })
        );
    });
});
