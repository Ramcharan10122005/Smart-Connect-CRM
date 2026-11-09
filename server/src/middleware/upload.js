import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

// In-memory storage for CSV upload parsing
const storage = multer.memoryStorage();

// File filter: accept CSV and plain text MIME types or .csv filenames
const csvFileFilter = (req, file, cb) => {
  const isCsvExtension = file.originalname && file.originalname.toLowerCase().endsWith('.csv');
  const isCsvMime = [
    'text/csv',
    'application/csv',
    'text/plain',
    'application/vnd.ms-excel',
    'text/x-csv',
  ].includes(file.mimetype);

  if (isCsvExtension || isCsvMime) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Invalid file format. Only CSV files are accepted.', 'INVALID_FILE_TYPE'));
  }
};

export const uploadCsv = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: csvFileFilter,
});

export default uploadCsv;
