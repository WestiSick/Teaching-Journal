// frontend/landing/src/utils/utility.js

// This function handles sending form data to Telegram
export async function sendToTelegram(formData) {
    const BOT_TOKEN = '8024259896:AAHR1cNJoJRbxRI1hWAfvILeafyevRSpRDA';

    try {
        // First, we need to get the chat_id of the bot owner/admin
        // We'll use getUpdates to find any chats the bot is in
        const updatesResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`);
        const updatesData = await updatesResponse.json();

        // If there are no updates, we need the bot owner to send at least one message to the bot
        if (!updatesData.ok || !updatesData.result || updatesData.result.length === 0) {
            return {
                success: false,
                message: "Пожалуйста, отправьте хотя бы одно сообщение боту в Telegram, чтобы он мог отправлять вам заявки."
            };
        }

        // Get the most recent chat_id from updates
        // This should be the bot owner's chat
        const chatId = updatesData.result[0].message.chat.id;

        // Format the message text
        const messageText = `
🔔 *Новая заявка с сайта* 🔔

*Учреждение:* ${formData.institution}
*Контактное лицо:* ${formData.contactPerson}
*Email:* ${formData.email}
*Тип учреждения:* ${formData.institutionType}
    `;

        // Send the message to Telegram
        const sendResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: messageText,
                parse_mode: 'Markdown'
            }),
        });

        const sendData = await sendResponse.json();

        if (sendData.ok) {
            return {
                success: true,
                message: "Заявка успешно отправлена! Мы свяжемся с вами в ближайшее время."
            };
        } else {
            console.error("Telegram API error:", sendData);
            return {
                success: false,
                message: "Произошла ошибка при отправке заявки. Пожалуйста, попробуйте позже."
            };
        }
    } catch (error) {
        console.error("Error sending to Telegram:", error);
        return {
            success: false,
            message: "Произошла ошибка при отправке заявки. Пожалуйста, попробуйте позже."
        };
    }
}

// Validate form data - returns error message or null if valid
export function validateFormData(formData) {
    if (!formData.institution.trim()) {
        return "Пожалуйста, введите название учреждения";
    }

    if (!formData.contactPerson.trim()) {
        return "Пожалуйста, введите имя контактного лица";
    }

    if (!formData.email.trim()) {
        return "Пожалуйста, введите электронную почту";
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
        return "Пожалуйста, введите корректный адрес электронной почты";
    }

    if (!formData.institutionType) {
        return "Пожалуйста, выберите тип учебного заведения";
    }

    return null; // No errors
}