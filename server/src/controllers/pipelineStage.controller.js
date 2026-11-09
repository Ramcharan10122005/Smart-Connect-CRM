import * as stageService from '../services/pipelineStage.service.js';
import { successResponse } from '../utils/response.js';

export async function getPipelineStages(req, res) {
  const stages = await stageService.getPipelineStages();
  return successResponse(res, stages);
}

export async function createPipelineStage(req, res) {
  const stage = await stageService.createPipelineStage(req.body, req.user);
  return successResponse(res, stage, {}, 201);
}

export async function updatePipelineStage(req, res) {
  const stage = await stageService.updatePipelineStage(req.params.id, req.body, req.user);
  return successResponse(res, stage);
}

export async function reorderPipelineStages(req, res) {
  const stages = await stageService.reorderPipelineStages(req.body.stageIds, req.user);
  return successResponse(res, stages);
}

export async function deletePipelineStage(req, res) {
  const targetStageId = req.query.targetStageId || req.body?.targetStageId;
  const result = await stageService.deletePipelineStage(req.params.id, targetStageId, req.user);
  return successResponse(res, result);
}

export default {
  getPipelineStages,
  createPipelineStage,
  updatePipelineStage,
  reorderPipelineStages,
  deletePipelineStage,
};
