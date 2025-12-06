import { z } from "zod";

export function validate(schema) {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const issues = Array.isArray(err.errors)
          ? err.errors
          : Array.isArray(err.issues)
            ? err.issues
            : [];

        return res.status(400).json({
          error: "Validation failed",
          code: "validation_error",
          issues: issues.map((issue) => ({
            path: issue.path,
            message: issue.path?.length
              ? `${issue.path.join(".")}: ${issue.message}`
              : issue.message,
            code: issue.code,
          })),
        });
      }
      next(err);
    }
  };
}
