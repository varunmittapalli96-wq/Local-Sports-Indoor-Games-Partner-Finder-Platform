import { Request, Response, NextFunction } from 'express';

const cleanObject = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanObject);
  }

  const cleaned: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    // Strip operators starting with $ or containing dots
    if (!key.startsWith('$') && !key.includes('.')) {
      cleaned[key] = cleanObject(obj[key]);
    }
  }
  return cleaned;
};

export const mongoSanitize = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body) req.body = cleanObject(req.body);
  if (req.query) req.query = cleanObject(req.query);
  if (req.params) req.params = cleanObject(req.params);
  next();
};
