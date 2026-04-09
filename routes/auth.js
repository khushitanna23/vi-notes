import express from "express";
import { body } from "express-validator";
import authController from "../controllers/authController.js";

const router = express.Router();

// Validation rules
const registerValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .notEmpty()
    .withMessage("Password is required"),
];

// Routes
router.post("/register", ...registerValidation, authController.register);
router.post("/login", ...loginValidation, authController.login);

// ✅ IMPORTANT (default export)
export default router;