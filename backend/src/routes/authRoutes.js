import { Router } from "express";
import createUserController from "../controllers/createUserController.js";
import login from "../controllers/loginController.js";
import logout from "../controllers/logoutController.js";
import authenticate from "../middleware/authenticate.js";
import authorizeAdmin from "../middleware/authorizeAdmin.js";
import validateCreateUser from "../middleware/validateCreateUser.js";
import validateLogin from "../middleware/validateLogin.js";

const router = Router();

router.post("/login", validateLogin, login);
router.post("/logout", logout);
router.get("/me", authenticate, (req, res) => res.json({ usuario: req.user }));
router.post(
  "/register",
  authenticate,
  authorizeAdmin,
  validateCreateUser,
  createUserController,
);

export default router;
