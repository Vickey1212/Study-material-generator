from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import google.generativeai as genai
import os
from dotenv import load_dotenv
import tempfile
from PIL import Image
import io
import textwrap
import pdfkit

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure Gemini API
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

# Set up the model
generation_config = {
    "temperature": 0.7,
    "top_p": 1,
    "top_k": 32,
    "max_output_tokens": 4096,
}

safety_settings = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

model = genai.GenerativeModel(
    model_name="gemini-pro-vision",
    generation_config=generation_config,
    safety_settings=safety_settings
)

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        topic = data.get('topic')
        needs_image = data.get('needs_image', False)
        
        if needs_image:
            # Generate text with image prompt
            prompt = f"""
            You are a helpful study assistant. Explain the topic: {topic} in detail with examples. 
            Include a detailed description of an image that would help visualize this concept, 
            formatted as [IMAGE: description of image to generate]. 
            Structure your response with headings, subheadings, and bullet points.
            """
        else:
            prompt = f"""
            You are a helpful study assistant. Explain the topic: {topic} in detail with examples.
            Structure your response with headings, subheadings, and bullet points.
            """
        
        response = model.generate_content(prompt)
        
        return jsonify({
            "response": response.text,
            "needs_image": needs_image
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/generate-image', methods=['POST'])
def generate_image():
    try:
        data = request.json
        description = data.get('description')
        
        # Use the image generation model (Gemini Pro Vision can suggest but not generate images)
        # For actual image generation, we'd typically use a different API like Stable Diffusion
        # Here we'll simulate it since Gemini doesn't directly generate images
        
        # In a real implementation, you would call an image generation API here
        # For now, we'll return a placeholder response
        return jsonify({
            "image_url": f"https://placehold.co/600x400?text={description[:50]}...",
            "description": description
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/generate-pdf', methods=['POST'])
def generate_pdf():
    try:
        data = request.json
        content = data.get('content')
        image_url = data.get('image_url', None)
        
        # Create PDF with image if available
        html_content = f"""
        <html>
            <head>
                <meta charset="UTF-8">
                <title>Study Material</title>
                <style>
                    body {{ font-family: Arial; padding: 20px; }}
                    h1 {{ color: #2c3e50; }}
                    p, li {{ line-height: 1.6; }}
                    img {{ max-width: 100%; height: auto; margin: 20px 0; }}
                </style>
            </head>
            <body>
                <h1>Study Material</h1>
                {content.replace('\n', '<br>')}
                {f'<img src="{image_url}" alt="Study visual aid">' if image_url else ''}
            </body>
        </html>
        """
        
        pdf = pdfkit.from_string(html_content, False)
        
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            tmp.write(pdf)
            tmp_path = tmp.name
        
        return send_file(
            tmp_path,
            as_attachment=True,
            download_name='study_material.pdf',
            mimetype='application/pdf'
        )
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)