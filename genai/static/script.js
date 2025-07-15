document.addEventListener('DOMContentLoaded', function() {
    const messagesContainer = document.getElementById('messages');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const imageToggle = document.getElementById('image-toggle');
    const pdfBtn = document.getElementById('pdf-btn');
    
    let includeImages = true;
    let currentContent = '';
    let currentImageUrl = '';
    
    // Toggle image inclusion
    imageToggle.addEventListener('click', function() {
        includeImages = !includeImages;
        imageToggle.classList.toggle('active');
    });
    
    // Send message
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
    });
    
    // Generate PDF
    pdfBtn.addEventListener('click', generatePDF);
    
    function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;
        
        // Add user message to chat
        addMessage(message, true);
        userInput.value = '';
        
        // Show loading indicator
        const loadingMsg = addMessage('Thinking...', false);
        
        // Call backend API
        fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                topic: message,
                needs_image: includeImages
            })
        })
        .then(response => response.json())
        .then(data => {
            // Remove loading message
            messagesContainer.removeChild(loadingMsg);
            
            if (data.error) {
                addMessage(`Error: ${data.error}`, false);
                return;
            }
            
            // Add AI response
            currentContent = data.response;
            addMessage(data.response, false);
            
            // Check if response contains image prompt
            const imageMatch = data.response.match(/\[IMAGE:(.*?)\]/);
            if (includeImages && imageMatch) {
                const imageDesc = imageMatch[1].trim();
                generateImage(imageDesc);
            }
        })
        .catch(error => {
            messagesContainer.removeChild(loadingMsg);
            addMessage('Error connecting to the server', false);
            console.error('Error:', error);
        });
    }
    
    function generateImage(description) {
        fetch('/api/generate-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description: description
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Image generation error:', data.error);
                return;
            }
            
            currentImageUrl = data.image_url;
            
            // Add image to chat
            const imgMessage = document.createElement('div');
            imgMessage.className = 'message ai-message';
            imgMessage.innerHTML = `
                <div class="avatar">AI</div>
                <div class="content">
                    <p>Here's a visual representation:</p>
                    <img src="${data.image_url}" alt="${data.description}">
                </div>
            `;
            messagesContainer.appendChild(imgMessage);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
    }
    
    function generatePDF() {
        if (!currentContent) {
            alert('No content to generate PDF');
            return;
        }
        
        fetch('/api/generate-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: currentContent,
                image_url: currentImageUrl
            })
        })
        .then(response => {
            if (!response.ok) throw new Error('PDF generation failed');
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'study_material.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        })
        .catch(error => {
            console.error('PDF generation error:', error);
            alert('Failed to generate PDF');
        });
    }
    
    function addMessage(content, isUser) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
        msgDiv.innerHTML = `
            <div class="avatar">${isUser ? 'You' : 'AI'}</div>
            <div class="content">
                <p>${content.replace(/\n/g, '<br>')}</p>
            </div>
        `;
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return msgDiv;
    }
});