import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV3Small
from tensorflow.keras import layers, models, optimizers
import tensorflowjs as tfjs

# Configuration
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 10
DATA_DIR = 'training/datasets/processed'
OUTPUT_DIR = 'src/assets/models/mobilenet'

def train():
    print("Checking GPU...")
    print("Num GPUs Available: ", len(tf.config.list_physical_devices('GPU')))

    # Data Generators
    # We pass [0, 255] images. MobileNetV3 expects this and has internal preprocessing usually,
    # but to be deterministic we will ensure our own Rescaling if we build a custom top.
    train_datagen = ImageDataGenerator(
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        horizontal_flip=True,
        validation_split=0.2
    )

    print(f"Loading data from {DATA_DIR}...")
    
    train_generator = train_datagen.flow_from_directory(
        DATA_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='training'
    )

    validation_generator = train_datagen.flow_from_directory(
        DATA_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='validation'
    )

    # Save labels
    labels = list(train_generator.class_indices.keys())
    print("Labels:", labels)
    
    # Model Setup: MobileNetV3Small
    print("Building MobileNetV3Small model...")
    
    # Switch to Small to keep bundle size < 5MB
    base_model = MobileNetV3Small(
        weights='imagenet',
        include_top=False,
        input_shape=(224, 224, 3),
        minimalistic=False
    )
    base_model.trainable = False 

    inputs = base_model.input
    x = base_model.output
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dense(128, activation='relu')(x)
    x = layers.Dropout(0.5)(x)
    outputs = layers.Dense(len(labels), activation='softmax')(x)

    model = models.Model(inputs=inputs, outputs=outputs)

    model.compile(optimizer=optimizers.Adam(learning_rate=0.0001),
                  loss='categorical_crossentropy',
                  metrics=['accuracy'])

    model.summary()

    # Train
    print("Starting training...")
    model.fit(
        train_generator,
        epochs=EPOCHS,
        validation_data=validation_generator
    )

    # Fine-tuning
    print("Fine-tuning...")
    base_model.trainable = True
    # Freeze all layers except the last 30
    for layer in base_model.layers[:-30]:
        layer.trainable = False
        
    model.compile(optimizer=optimizers.Adam(learning_rate=1e-5),
                  loss='categorical_crossentropy',
                  metrics=['accuracy'])
                  
    model.fit(
        train_generator,
        epochs=5,
        validation_data=validation_generator
    )

    # Save Keras model
    print("Saving model...")
    model.save('training/model.keras')

    # Convert to TFJS
    print(f"Converting to TFJS format in {OUTPUT_DIR}...")
    import shutil
    if os.path.exists(OUTPUT_DIR):
        shutil.rmtree(OUTPUT_DIR)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    tfjs.converters.save_keras_model(model, OUTPUT_DIR)
    
    # Save Metadata
    import json
    metadata = {
        "labels": labels,
        "modelName": "MobileNetV3Small-TrumpFilter",
        "version": "2.0.0",
        "inputRange": "[0, 255] (Internal Norm)"
    }
    with open(os.path.join(OUTPUT_DIR, 'metadata.json'), 'w') as f:
        json.dump(metadata, f)
        
    print("Done!")

if __name__ == '__main__':
    if not os.path.exists(DATA_DIR):
        print(f"Error: Data directory {DATA_DIR} not found.")
    else:
        train()
