import * as userService from '../services/user.service.js';
import { successResponse } from '../utils/response.js';

export async function getUsers(req, res) {
  const { users, meta } = await userService.getUsers(req.query);
  return successResponse(res, users, meta);
}

export async function inviteUser(req, res) {
  const newUser = await userService.inviteUser({
    ...req.body,
    invitingUser: req.user,
  });
  return successResponse(res, newUser, {}, 201);
}

export async function updateUser(req, res) {
  const updatedUser = await userService.updateUser({
    id: req.params.id,
    updaterUser: req.user,
    data: req.body,
  });
  return successResponse(res, updatedUser);
}

export async function updateMe(req, res) {
  const updatedMe = await userService.updateMe({
    userId: req.user.id,
    data: req.body,
  });
  return successResponse(res, updatedMe);
}

export default {
  getUsers,
  inviteUser,
  updateUser,
  updateMe,
};
