FROM python:3.11-slim

# Install system dependencies and dos2unix
RUN apt-get update && apt-get install -y \
    build-essential \
    libmagic-dev \
    dos2unix \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user (UID 1000 is required by Hugging Face)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Install Python dependencies first
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY --chown=user . .

# Fix script formatting and make it executable
RUN dos2unix start.sh && chmod +x start.sh

# Expose the Hugging Face default port
EXPOSE 7860

# Run the dual-boot script
CMD ["./start.sh"]