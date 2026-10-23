"""
Run this inside Google Colab (GPU Runtime: T4 / L4 / A100):
!pip install -q "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
!pip install -q --no-deps trl peft accelerate bitsandbytes
"""
from unsloth import FastLanguageModel
import torch
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments

MAX_SEQ_LENGTH = 2048
MODEL_NAME = "unsloth/Qwen2.5-7B-Instruct-bnb-4bit"

def train_buddy():
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=MODEL_NAME,
        max_seq_length=MAX_SEQ_LENGTH,
        load_in_4bit=True,
    )
    model = FastLanguageModel.get_peft_model(
        model,
        r=16,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_alpha=16,
        lora_dropout=0,
        bias="none",
        use_gradient_checkpointing="unsloth",
    )

    prompt_template = """<|im_start|>system
{instruction}<|im_end|>
<|im_start|>user
{input}<|im_end|>
<|im_start|>assistant
{output}<|im_end|>"""

    dataset = load_dataset("json", data_files="buddy_b2b_bhubaneswar_train.jsonl", split="train")
    def format_prompts(examples):
        texts = [
            prompt_template.format(instruction=i, input=inp, output=o)
            for i, inp, o in zip(examples["instruction"], examples["input"], examples["output"])
        ]
        return {"text": texts}

    dataset = dataset.map(format_prompts, batched=True)

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        dataset_text_field="text",
        max_seq_length=MAX_SEQ_LENGTH,
        args=TrainingArguments(
            per_device_train_batch_size=2,
            gradient_accumulation_steps=4,
            warmup_steps=5,
            max_steps=60,
            learning_rate=2e-4,
            fp16=not torch.cuda.is_bf16_supported(),
            bf16=torch.cuda.is_bf16_supported(),
            logging_steps=5,
            output_dir="buddy_b2b_lora_outputs",
            optim="adamw_8bit",
        ),
    )
    trainer.train()
    # Export 4-bit GGUF for compact fast inference + LoRA adapters
    model.save_pretrained("buddy_b2b_adapter")
    tokenizer.save_pretrained("buddy_b2b_adapter")
    model.save_pretrained_gguf("buddy_b2b_gguf", tokenizer, quantization_method="q4_k_m")
    print("Buddy B2B Compact Model Trained & Exported to GGUF!")

if __name__ == "__main__":
    train_buddy()
