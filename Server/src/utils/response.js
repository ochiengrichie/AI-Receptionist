export const sendResponse = (res, success, data = null, error = null, statusCode=200) => {
    res.status(statusCode).json({success, data, error});
};