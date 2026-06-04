const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const { env } = require('./env');

cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // 1. Tách tên file gốc và phần đuôi (extension như rar, zip, pdf...)
        const lastDotIndex = file.originalname.lastIndexOf('.');
        const baseName = lastDotIndex !== -1 ? file.originalname.substring(0, lastDotIndex) : file.originalname;
        const extension = lastDotIndex !== -1 ? file.originalname.substring(lastDotIndex + 1) : '';

        // 2. Dọn dẹp tên (Bỏ tiếng việt có dấu, dấu cách) để làm đường dẫn URL chuẩn hơn
        const cleanName = baseName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50);

        // 3. Phân biệt file đa phương tiện và file tài liệu
        const isMedia = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');

        return {
            folder: 'taska_attachments',
            resource_type: 'auto',
            public_id: isMedia
                ? `${cleanName}_${Date.now()}`
                : `${cleanName}_${Date.now()}.${extension}`
        };
    },
});

const uploadCloud = multer({ storage });

module.exports = { cloudinary, uploadCloud };
