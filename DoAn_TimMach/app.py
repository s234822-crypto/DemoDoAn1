"""
CardioPredict AI - Hệ thống dự đoán bệnh tim nâng cấp
"""

import joblib
import pandas as pd
import tkinter as tk
from tkinter import ttk, messagebox
import os

# =========================
# Load Model và Scaler
# =========================

def load_model():
    try:
        model_path = os.path.join(os.path.dirname(__file__), 'models', 'heart_model.pkl')
        return joblib.load(model_path)
    except:
        messagebox.showerror("Lỗi", "Không tìm thấy model!")
        return None

def load_scaler():
    try:
        scaler_path = os.path.join(os.path.dirname(__file__), 'models', 'scaler.pkl')
        return joblib.load(scaler_path)
    except:
        return None


# =========================
# AI Giải thích nguy cơ
# =========================

def explain_risk(data):

    reasons = []

    if data["age"] > 55:
        reasons.append("Tuổi cao làm tăng nguy cơ bệnh tim")

    if data["chol"] > 240:
        reasons.append("Cholesterol cao")

    if data["trestbps"] > 140:
        reasons.append("Huyết áp cao")

    if data["thalach"] < 120:
        reasons.append("Nhịp tim tối đa thấp")

    if data["oldpeak"] > 2:
        reasons.append("ST Depression cao")

    if data["ca"] > 1:
        reasons.append("Có nhiều mạch máu bị tắc")

    if len(reasons) == 0:
        return "Không phát hiện yếu tố nguy cơ lớn"

    return "\n".join(reasons)


# =========================
# Phân loại Risk Level
# =========================

def risk_level(prob):

    if prob < 0.25:
        return "Nguy cơ THẤP", "green"

    elif prob < 0.50:
        return "Nguy cơ TRUNG BÌNH", "orange"

    elif prob < 0.75:
        return "Nguy cơ CAO", "red"

    else:
        return "Nguy cơ RẤT CAO", "darkred"


# =========================
# Hàm dự đoán
# =========================

def predict():

    try:

        data = {
            'age': float(entry_age.get()),
            'sex': combo_sex.current(),
            'cp': combo_cp.current(),
            'trestbps': float(entry_trestbps.get()),
            'chol': float(entry_chol.get()),
            'fbs': combo_fbs.current(),
            'restecg': combo_restecg.current(),
            'thalach': float(entry_thalach.get()),
            'exang': combo_exang.current(),
            'oldpeak': float(entry_oldpeak.get()),
            'slope': combo_slope.current(),
            'ca': combo_ca.current(),
            'thal': combo_thal.current() + 1
        }

        columns = [
            'age','sex','cp','trestbps','chol','fbs','restecg',
            'thalach','exang','oldpeak','slope','ca','thal'
        ]

        input_df = pd.DataFrame([data])[columns]

        model = load_model()
        scaler = load_scaler()

        if model is None:
            return

        if scaler:
            input_df = scaler.transform(input_df)

        prediction = model.predict(input_df)[0]
        probability = model.predict_proba(input_df)[0][1]

        level, color = risk_level(probability)

        explanation = explain_risk(data)

        result_text = f"""
Xác suất mắc bệnh tim: {probability*100:.1f}%

Mức độ nguy cơ: {level}

Phân tích AI:
{explanation}
"""

        label_result.config(text=result_text, foreground=color)

    except ValueError:
        messagebox.showerror("Lỗi", "Vui lòng nhập đầy đủ thông tin!")


# =========================
# Clear Form
# =========================

def clear_form():

    entry_age.delete(0, tk.END)
    entry_trestbps.delete(0, tk.END)
    entry_chol.delete(0, tk.END)
    entry_thalach.delete(0, tk.END)
    entry_oldpeak.delete(0, tk.END)

    combo_sex.current(0)
    combo_cp.current(0)
    combo_fbs.current(0)
    combo_restecg.current(0)
    combo_exang.current(0)
    combo_slope.current(0)
    combo_ca.current(0)
    combo_thal.current(0)

    label_result.config(text="")


# =========================
# UI
# =========================

root = tk.Tk()
root.title("CardioPredict AI")
root.geometry("620x720")
root.resizable(False, False)

style = ttk.Style()
style.configure("Header.TLabel", font=("Segoe UI", 18, "bold"))

header = ttk.Label(root, text="🫀 CardioPredict AI", style="Header.TLabel")
header.pack(pady=15)

main = ttk.Frame(root, padding=20)
main.pack()

# Tuổi
ttk.Label(main, text="Tuổi").grid(row=0,column=0)
entry_age = ttk.Entry(main)
entry_age.grid(row=0,column=1)

# Giới tính
ttk.Label(main, text="Giới tính").grid(row=0,column=2)
combo_sex = ttk.Combobox(main, values=["Nữ","Nam"], state="readonly")
combo_sex.grid(row=0,column=3)
combo_sex.current(0)

# Chest pain
ttk.Label(main,text="Loại đau ngực").grid(row=1,column=0)
combo_cp = ttk.Combobox(main,values=[
"Điển hình",
"Không điển hình",
"Đau không do tim",
"Không triệu chứng"
],state="readonly")
combo_cp.grid(row=1,column=1)
combo_cp.current(0)

# Huyết áp
ttk.Label(main,text="Huyết áp").grid(row=2,column=0)
entry_trestbps = ttk.Entry(main)
entry_trestbps.grid(row=2,column=1)

# Cholesterol
ttk.Label(main,text="Cholesterol").grid(row=2,column=2)
entry_chol = ttk.Entry(main)
entry_chol.grid(row=2,column=3)

# Đường huyết
ttk.Label(main,text="Đường huyết >120").grid(row=3,column=0)
combo_fbs = ttk.Combobox(main,values=["Không","Có"],state="readonly")
combo_fbs.grid(row=3,column=1)
combo_fbs.current(0)

# ECG
ttk.Label(main,text="ECG").grid(row=3,column=2)
combo_restecg = ttk.Combobox(main,values=[
"Bình thường",
"Bất thường ST",
"Phì đại thất"
],state="readonly")
combo_restecg.grid(row=3,column=3)
combo_restecg.current(0)

# Nhịp tim
ttk.Label(main,text="Nhịp tim tối đa").grid(row=4,column=0)
entry_thalach = ttk.Entry(main)
entry_thalach.grid(row=4,column=1)

# Đau khi tập
ttk.Label(main,text="Đau khi tập").grid(row=4,column=2)
combo_exang = ttk.Combobox(main,values=["Không","Có"],state="readonly")
combo_exang.grid(row=4,column=3)
combo_exang.current(0)

# ST depression
ttk.Label(main,text="ST Depression").grid(row=5,column=0)
entry_oldpeak = ttk.Entry(main)
entry_oldpeak.grid(row=5,column=1)

# slope
ttk.Label(main,text="Slope").grid(row=5,column=2)
combo_slope = ttk.Combobox(main,values=[
"Dốc lên",
"Phẳng",
"Dốc xuống"
],state="readonly")
combo_slope.grid(row=5,column=3)
combo_slope.current(0)

# ca
ttk.Label(main,text="Số mạch máu").grid(row=6,column=0)
combo_ca = ttk.Combobox(main,values=["0","1","2","3"],state="readonly")
combo_ca.grid(row=6,column=1)
combo_ca.current(0)

# thal
ttk.Label(main,text="Thalassemia").grid(row=6,column=2)
combo_thal = ttk.Combobox(main,values=[
"Bình thường",
"Khiếm khuyết cố định",
"Khiếm khuyết đảo ngược"
],state="readonly")
combo_thal.grid(row=6,column=3)
combo_thal.current(0)

# Buttons
btn_frame = ttk.Frame(root)
btn_frame.pack(pady=20)

ttk.Button(btn_frame,text="🔍 Dự đoán",command=predict).pack(side="left",padx=10)
ttk.Button(btn_frame,text="🗑️ Xóa",command=clear_form).pack(side="left",padx=10)

# Result
result_frame = ttk.LabelFrame(root,text="Kết quả AI",padding=20)
result_frame.pack(fill="x",padx=20,pady=10)

label_result = ttk.Label(result_frame,text="",font=("Segoe UI",12))
label_result.pack()

root.mainloop()