"""
Ứng dụng dự đoán bệnh tim
File chính để chạy chương trình (Giao diện Tkinter)
"""

import joblib
import pandas as pd
import tkinter as tk
from tkinter import ttk, messagebox
import os

# Load mô hình đã train
def load_model():
    try:
        model_path = os.path.join(os.path.dirname(__file__), 'models', 'heart_model.pkl')
        model = joblib.load(model_path)
        return model
    except FileNotFoundError:
        messagebox.showerror("Lỗi", "Không tìm thấy file mô hình! Vui lòng train mô hình trước.")
        return None

# Hàm dự đoán
def predict():
    try:
        # Lấy giá trị từ các input
        data = {
            'age': float(entry_age.get()),
            'sex': int(combo_sex.current()),
            'cp': int(combo_cp.current()),
            'trestbps': float(entry_trestbps.get()),
            'chol': float(entry_chol.get()),
            'fbs': int(combo_fbs.current()),
            'restecg': int(combo_restecg.current()),
            'thalach': float(entry_thalach.get()),
            'exang': int(combo_exang.current()),
            'oldpeak': float(entry_oldpeak.get()),
            'slope': int(combo_slope.current()),
            'ca': int(combo_ca.current()),
            'thal': int(combo_thal.current())
        }
        
        # Tạo DataFrame
        input_df = pd.DataFrame([data])
        
        # Dự đoán
        model = load_model()
        if model:
            prediction = model.predict(input_df)[0]
            probability = model.predict_proba(input_df)[0]
            
            if prediction == 1:
                result = f"CÓ NGUY CƠ mắc bệnh tim\nXác suất: {probability[1]*100:.1f}%"
                label_result.config(text=result, foreground="red")
            else:
                result = f"KHÔNG CÓ nguy cơ mắc bệnh tim\nXác suất an toàn: {probability[0]*100:.1f}%"
                label_result.config(text=result, foreground="green")
                
    except ValueError as e:
        messagebox.showerror("Lỗi", f"Vui lòng nhập đầy đủ và đúng định dạng!\n{str(e)}")
    except Exception as e:
        messagebox.showerror("Lỗi", f"Có lỗi xảy ra: {str(e)}")

# Hàm xóa form
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

# Tạo cửa sổ chính
root = tk.Tk()
root.title("🫀 Hệ thống Dự đoán Bệnh Tim - CardioPredict AI")
root.geometry("600x700")
root.resizable(False, False)

# Style
style = ttk.Style()
style.configure("TLabel", font=("Segoe UI", 10))
style.configure("TButton", font=("Segoe UI", 10, "bold"))
style.configure("Header.TLabel", font=("Segoe UI", 16, "bold"))

# Header
header_frame = ttk.Frame(root, padding="20")
header_frame.pack(fill="x")

ttk.Label(header_frame, text="🫀 Dự đoán Bệnh Tim", style="Header.TLabel").pack()
ttk.Label(header_frame, text="Nhập thông tin bệnh nhân để dự đoán nguy cơ", 
          font=("Segoe UI", 9, "italic")).pack()

# Main frame
main_frame = ttk.Frame(root, padding="20")
main_frame.pack(fill="both", expand=True)

# Row 0: Tuổi, Giới tính
ttk.Label(main_frame, text="Tuổi *").grid(row=0, column=0, sticky="w", pady=5)
entry_age = ttk.Entry(main_frame, width=15)
entry_age.grid(row=0, column=1, pady=5, padx=5)

ttk.Label(main_frame, text="Giới tính *").grid(row=0, column=2, sticky="w", pady=5)
combo_sex = ttk.Combobox(main_frame, values=["Nữ", "Nam"], state="readonly", width=12)
combo_sex.grid(row=0, column=3, pady=5)
combo_sex.current(0)

# Row 1: Loại đau ngực
ttk.Label(main_frame, text="Loại đau ngực *").grid(row=1, column=0, sticky="w", pady=5)
combo_cp = ttk.Combobox(main_frame, values=[
    "0 - Điển hình", 
    "1 - Không điển hình", 
    "2 - Đau không do tim", 
    "3 - Không triệu chứng"
], state="readonly", width=25)
combo_cp.grid(row=1, column=1, columnspan=3, sticky="w", pady=5)
combo_cp.current(0)

# Row 2: Huyết áp, Cholesterol
ttk.Label(main_frame, text="Huyết áp nghỉ (mm Hg) *").grid(row=2, column=0, sticky="w", pady=5)
entry_trestbps = ttk.Entry(main_frame, width=15)
entry_trestbps.grid(row=2, column=1, pady=5, padx=5)

ttk.Label(main_frame, text="Cholesterol (mg/dl) *").grid(row=2, column=2, sticky="w", pady=5)
entry_chol = ttk.Entry(main_frame, width=15)
entry_chol.grid(row=2, column=3, pady=5)

# Row 3: Đường huyết, ECG
ttk.Label(main_frame, text="Đường huyết > 120 *").grid(row=3, column=0, sticky="w", pady=5)
combo_fbs = ttk.Combobox(main_frame, values=["Không", "Có"], state="readonly", width=12)
combo_fbs.grid(row=3, column=1, pady=5, padx=5)
combo_fbs.current(0)

ttk.Label(main_frame, text="ECG nghỉ *").grid(row=3, column=2, sticky="w", pady=5)
combo_restecg = ttk.Combobox(main_frame, values=[
    "0 - Bình thường", 
    "1 - Bất thường ST-T", 
    "2 - Phì đại thất trái"
], state="readonly", width=18)
combo_restecg.grid(row=3, column=3, pady=5)
combo_restecg.current(0)

# Row 4: Nhịp tim tối đa
ttk.Label(main_frame, text="Nhịp tim tối đa (bpm) *").grid(row=4, column=0, sticky="w", pady=5)
entry_thalach = ttk.Entry(main_frame, width=15)
entry_thalach.grid(row=4, column=1, pady=5, padx=5)

ttk.Label(main_frame, text="Đau ngực khi tập *").grid(row=4, column=2, sticky="w", pady=5)
combo_exang = ttk.Combobox(main_frame, values=["Không", "Có"], state="readonly", width=12)
combo_exang.grid(row=4, column=3, pady=5)
combo_exang.current(0)

# Row 5: ST Depression, Slope
ttk.Label(main_frame, text="ST Depression *").grid(row=5, column=0, sticky="w", pady=5)
entry_oldpeak = ttk.Entry(main_frame, width=15)
entry_oldpeak.grid(row=5, column=1, pady=5, padx=5)

ttk.Label(main_frame, text="Độ dốc ST *").grid(row=5, column=2, sticky="w", pady=5)
combo_slope = ttk.Combobox(main_frame, values=[
    "0 - Dốc lên", 
    "1 - Phẳng", 
    "2 - Dốc xuống"
], state="readonly", width=15)
combo_slope.grid(row=5, column=3, pady=5)
combo_slope.current(0)

# Row 6: Số mạch máu, Thalassemia
ttk.Label(main_frame, text="Số mạch máu chính *").grid(row=6, column=0, sticky="w", pady=5)
combo_ca = ttk.Combobox(main_frame, values=["0", "1", "2", "3"], state="readonly", width=12)
combo_ca.grid(row=6, column=1, pady=5, padx=5)
combo_ca.current(0)

ttk.Label(main_frame, text="Thalassemia *").grid(row=6, column=2, sticky="w", pady=5)
combo_thal = ttk.Combobox(main_frame, values=[
    "0 - Bình thường", 
    "1 - Khiếm khuyết cố định", 
    "2 - Khiếm khuyết có thể đảo ngược"
], state="readonly", width=25)
combo_thal.grid(row=6, column=3, pady=5)
combo_thal.current(0)

# Separator
ttk.Separator(main_frame, orient="horizontal").grid(row=7, column=0, columnspan=4, sticky="ew", pady=15)

# Buttons
btn_frame = ttk.Frame(main_frame)
btn_frame.grid(row=8, column=0, columnspan=4, pady=10)

btn_predict = ttk.Button(btn_frame, text="🔍 Dự đoán", command=predict)
btn_predict.pack(side="left", padx=10)

btn_clear = ttk.Button(btn_frame, text="🗑️ Xóa form", command=clear_form)
btn_clear.pack(side="left", padx=10)

# Result
result_frame = ttk.LabelFrame(main_frame, text="Kết quả dự đoán", padding="20")
result_frame.grid(row=9, column=0, columnspan=4, sticky="ew", pady=20)

label_result = ttk.Label(result_frame, text="", font=("Segoe UI", 14, "bold"), justify="center")
label_result.pack()

# Footer
footer_frame = ttk.Frame(root, padding="10")
footer_frame.pack(fill="x", side="bottom")
ttk.Label(footer_frame, text="© 2026 Daivid AI - Hệ thống dự đoán bệnh tim", 
          font=("Segoe UI", 8)).pack()

# Run
if __name__ == "__main__":
    root.mainloop()
