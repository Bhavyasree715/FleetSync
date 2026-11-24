import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { simulationEngine } from '../services/simulationEngine';

export const startSimulation = async (req: AuthRequest, res: Response) => {
  try {
    const success = await simulationEngine.startSimulation();
    res.json({ message: 'Fleet simulation started.', isSimulating: success });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start simulation.' });
  }
};

export const stopSimulation = async (req: AuthRequest, res: Response) => {
  try {
    const success = simulationEngine.stopSimulation();
    res.json({ message: 'Fleet simulation stopped.', isSimulating: false });
  } catch (error) {
    res.status(500).json({ error: 'Failed to stop simulation.' });
  }
};

export const getSimulationStatus = async (req: AuthRequest, res: Response) => {
  res.json({ isSimulating: simulationEngine.isSimulating() });
};

export const triggerOverspeed = async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleId } = req.body;
    const result = simulationEngine.triggerOverspeed(vehicleId);
    if (!result.success) {
      return res.status(400).json({ error: 'Simulation is not active or vehicle not found.' });
    }
    res.json({ message: `Triggered overspeed on ${result.plateNumber} at ${result.speed} km/h`, ...result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger overspeed.' });
  }
};

export const triggerSos = async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleId } = req.body;
    const result = await simulationEngine.triggerSos(vehicleId);
    if (!result.success) {
      return res.status(400).json({ error: 'Failed to trigger SOS.' });
    }
    res.json({ message: `Triggered critical SOS for ${result.plateNumber}`, ...result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger SOS.' });
  }
};
