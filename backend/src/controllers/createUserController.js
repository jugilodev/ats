import { createUser } from "../services/userService.js";

const createUserController = async (req, res) => {
  const user = await createUser(req.body);
  res.status(201).json({ usuario: user });
};

export default createUserController;
