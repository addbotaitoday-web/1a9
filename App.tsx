
import React, { useState, useMemo, useEffect } from 'react';
import { AppState } from './types';
import type { GradingResult, Exercise } from './types';
import FileUpload from './components/FileUpload';
import GradingResultComponent from './components/GradingResult';
import Spinner from './components/Spinner';
import { gradeStudentWork } from './services/geminiService';

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD_EXAM);
  const [examFiles, setExamFiles] = useState<File[]>([]);
  const [studentWorkFiles, setStudentWorkFiles] = useState<File[]>([]);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pointMemory, setPointMemory] = useState<Record<string, number>>({});
  const [notification, setNotification] = useState<string | null>(null);

  const examImagePreviews = useMemo(() => {
    return examFiles.map(file => URL.createObjectURL(file));
  }, [examFiles]);

  const studentWorkImagePreviews = useMemo(() => {
    return studentWorkFiles.map(file => URL.createObjectURL(file));
  }, [studentWorkFiles]);

  useEffect(() => {
    if (notification) {
        const timer = setTimeout(() => {
            setNotification(null);
        }, 5000); // Tự động ẩn sau 5 giây
        return () => clearTimeout(timer);
    }
  }, [notification]);
  
  // Cleanup object URLs on component unmount
  useEffect(() => {
    return () => {
        examImagePreviews.forEach(url => URL.revokeObjectURL(url));
        studentWorkImagePreviews.forEach(url => URL.revokeObjectURL(url));
    }
  }, [examImagePreviews, studentWorkImagePreviews]);


  const handleExamFileSelect = (newFiles: File[]) => {
    setExamFiles(prevFiles => {
      const allFiles = [...prevFiles, ...newFiles];
      const uniqueFiles = allFiles.filter((file, index, self) =>
        index === self.findIndex((f) => f.name === file.name && f.size === file.size)
      );
      return uniqueFiles;
    });
  };

  const handleExamFileRemove = (indexToRemove: number) => {
    setExamFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleClearExamFiles = () => {
    examImagePreviews.forEach(url => URL.revokeObjectURL(url));
    setExamFiles([]);
  }

  const handleStudentWorkFileSelect = (newFiles: File[]) => {
    setStudentWorkFiles(prevFiles => {
      const allFiles = [...prevFiles, ...newFiles];
      const uniqueFiles = allFiles.filter((file, index, self) =>
        index === self.findIndex((f) => f.name === file.name && f.size === file.size)
      );
      return uniqueFiles;
    });
  };

  const handleStudentWorkFileRemove = (indexToRemove: number) => {
    setStudentWorkFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleClearStudentWorkFiles = () => {
    studentWorkImagePreviews.forEach(url => URL.revokeObjectURL(url));
    setStudentWorkFiles([]);
  };

  const recalculateScores = (exercises: Exercise[]): GradingResult => {
    let grandTotalScore = 0;
    let grandTotalPossiblePoints = 0;

    const updatedExercises = exercises.map(ex => {
        const totalProblems = ex.problems.length;
        if (totalProblems === 0) {
            grandTotalPossiblePoints += ex.totalPossiblePoints;
            return { ...ex, studentScore: 0 };
        }
        const correctProblems = ex.problems.filter(p => p.studentScore === 1).length;
        const exerciseStudentScore = (correctProblems / totalProblems) * ex.totalPossiblePoints;
        
        grandTotalScore += exerciseStudentScore;
        grandTotalPossiblePoints += ex.totalPossiblePoints;

        return { ...ex, studentScore: exerciseStudentScore };
    });

    return {
        exercises: updatedExercises,
        totalScore: grandTotalScore,
        totalPossiblePoints: grandTotalPossiblePoints,
    };
  };

  const handleGrade = async () => {
    if (examFiles.length === 0) {
        setError("Vui lòng tải lên ảnh đề bài gốc.");
        return;
    }
    if (studentWorkFiles.length === 0) {
        setError("Vui lòng tải lên bài làm của học sinh.");
        return;
    }
    setIsLoading(true);
    setLoadingMessage('AI đang phân tích và chấm điểm...');
    setError(null);
    setNotification(null);
    setAppState(AppState.GRADING);
    try {
        const analyzedExercises = await gradeStudentWork(examFiles, studentWorkFiles);
        
        let rememberedPointsApplied = false;
        const exercisesWithPoints = analyzedExercises.map(ex => {
            const rememberedPoint = pointMemory[ex.title];
            if (rememberedPoint !== undefined) {
                rememberedPointsApplied = true;
            }
            return {
                ...ex,
                totalPossiblePoints: rememberedPoint !== undefined ? rememberedPoint : 10,
                studentScore: 0, 
            };
        });
        
        const newMemory = { ...pointMemory };
        exercisesWithPoints.forEach(ex => {
            newMemory[ex.title] = ex.totalPossiblePoints;
        });
        setPointMemory(newMemory);
        
        const initialResult = recalculateScores(exercisesWithPoints);
        setGradingResult(initialResult);

        if (rememberedPointsApplied) {
            setNotification("Đã áp dụng thang điểm đã ghi nhớ từ lần chấm trước.");
        }
        setAppState(AppState.SHOW_RESULTS);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi chấm bài.');
        setAppState(AppState.UPLOAD_STUDENT_WORK);
    } finally {
        setIsLoading(false);
    }
  };

  const handlePointsChange = (exerciseId: number, points: number) => {
    setGradingResult(prevResult => {
        if (!prevResult) return null;

        let exerciseTitle = '';
        const updatedExercises = prevResult.exercises.map(ex => 
            {
                if (ex.id === exerciseId) {
                    exerciseTitle = ex.title;
                    return { ...ex, totalPossiblePoints: points };
                }
                return ex;
            }
        );
        
        if (exerciseTitle) {
            setPointMemory(prevMemory => ({
              ...prevMemory,
              [exerciseTitle]: points,
            }));
        }

        return recalculateScores(updatedExercises);
    });
  };

  const handleCorrection = (exerciseId: number, problemId: number, newScore: 0 | 1) => {
    setGradingResult(prevResult => {
      if (!prevResult) return null;

      const updatedExercises = prevResult.exercises.map(ex => {
        if (ex.id === exerciseId) {
          const updatedProblems = ex.problems.map(p => {
            if (p.id === problemId) {
              return { ...p, studentScore: newScore };
            }
            return p;
          });
          return { ...ex, problems: updatedProblems };
        }
        return ex;
      });

      return recalculateScores(updatedExercises);
    });
  };

  const handleGradeAnotherStudent = () => {
    studentWorkImagePreviews.forEach(url => URL.revokeObjectURL(url));
    setStudentWorkFiles([]);
    setGradingResult(null);
    setIsLoading(false);
    setError(null);
    setNotification(null);
    setAppState(AppState.UPLOAD_STUDENT_WORK);
  };
  
  const handleGradeNewExam = () => {
    examImagePreviews.forEach(url => URL.revokeObjectURL(url));
    studentWorkImagePreviews.forEach(url => URL.revokeObjectURL(url));
    setAppState(AppState.UPLOAD_EXAM);
    setExamFiles([]);
    setStudentWorkFiles([]);
    setGradingResult(null);
    setIsLoading(false);
    setError(null);
    setNotification(null);
    setPointMemory({}); // Clear point memory for new exam
  }

  const renderContent = () => {
    if (isLoading) {
      return <Spinner message={loadingMessage} />;
    }

    switch (appState) {
      case AppState.UPLOAD_EXAM:
        return (
          <div className="w-full flex flex-col items-center gap-6">
             <h2 className="text-xl font-semibold text-gray-200">Bước 1: Tải lên đề bài</h2>
            <FileUpload
              onFileSelect={handleExamFileSelect}
              onFileRemove={handleExamFileRemove}
              onClearAll={handleClearExamFiles}
              previews={examImagePreviews}
              title="Tải lên ảnh đề bài gốc"
              description="Kéo và thả hoặc nhấp để chọn một hoặc nhiều ảnh đề bài."
              multiple={true}
            />
            {examFiles.length > 0 && (
                <button
                    onClick={() => setAppState(AppState.UPLOAD_STUDENT_WORK)}
                    className="w-full max-w-sm px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-all"
                >
                    Tiếp tục
                </button>
            )}
          </div>
        );

    case AppState.UPLOAD_STUDENT_WORK:
        return (
            <div className="w-full flex flex-col items-center gap-8">
                <div>
                    <button onClick={() => setAppState(AppState.UPLOAD_EXAM)} className="text-sm text-yellow-400 hover:underline mb-4">&larr; Quay lại để thay đổi đề bài</button>
                    <h2 className="text-xl font-semibold text-gray-200 mb-2">Đề bài đã tải lên:</h2>
                     <div className="flex gap-4 overflow-x-auto p-2 bg-black/20 rounded-lg">
                        {examImagePreviews.map((src, index) => (
                            <img key={index} src={src} alt={`Đề bài trang ${index + 1}`} className="max-h-80 rounded-lg shadow-md object-contain flex-shrink-0"/>
                        ))}
                    </div>
                </div>
                <div className="w-full border-t border-gray-700 pt-8">
                     <h2 className="text-xl font-semibold text-gray-200 text-center mb-4">Bước 2: Tải lên bài làm của học sinh</h2>
                    <FileUpload
                        onFileSelect={handleStudentWorkFileSelect}
                        onFileRemove={handleStudentWorkFileRemove}
                        onClearAll={handleClearStudentWorkFiles}
                        previews={studentWorkImagePreviews}
                        title="Tải lên ảnh bài làm của học sinh"
                        description="Kéo và thả hoặc nhấp để chọn một hoặc nhiều ảnh bài làm."
                        multiple={true}
                    />
                    {studentWorkFiles.length > 0 && (
                        <div className="flex flex-col items-center gap-4 mt-6 w-full">
                            <button
                                onClick={handleGrade}
                                className="w-full max-w-sm px-8 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isLoading}
                            >
                                Chấm {studentWorkFiles.length} ảnh
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )

      case AppState.SHOW_RESULTS:
          return (
            gradingResult && (
                <div className="w-full flex flex-col items-center">
                    <GradingResultComponent 
                        result={gradingResult} 
                        workImagePreviews={studentWorkImagePreviews}
                        onPointsChange={handlePointsChange}
                        onCorrection={handleCorrection}
                    />
                    <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full max-w-md">
                        <button
                            onClick={handleGradeAnotherStudent}
                            className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-all"
                        >
                            Chấm bài học sinh khác
                        </button>
                        <button
                            onClick={handleGradeNewExam}
                            className="w-full px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 transition-all"
                        >
                            Chấm đề bài mới
                        </button>
                    </div>
                </div>
            )
          )
      default:
        return null;
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 w-full bg-black/30 text-white p-3 sm:p-4 shadow-md z-50 backdrop-blur-sm">
          <div className="w-full max-w-4xl mx-auto flex items-center gap-3">
              <i className="fas fa-graduation-cap text-4xl sm:text-5xl text-pink-400"></i>
              <h1 className="font-chalk text-2xl sm:text-3xl whitespace-nowrap">1A9 <span className="hidden sm:inline">| Phần mềm hỗ trợ giảng dạy</span></h1>
          </div>
      </header>
      <div 
        className="min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-28 sm:px-6 sm:pt-28 lg:px-8 lg:pt-32"
        style={{
            backgroundImage: "url('https://www.toptal.com/designers/subtlepatterns/uploads/ep_naturalblack.png')",
            backgroundAttachment: 'fixed'
        }}
      >
        <div className="w-full max-w-4xl bg-black/30 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl p-6 sm:p-8 lg:p-12">
          <div className="text-center mb-8">
            <h2 className="font-chalk text-5xl text-pink-400 transform -rotate-3">Welcome 1A9</h2>
            <h1 className="font-chalk text-4xl sm:text-5xl text-yellow-300 mt-4 uppercase">
              Chức năng chấm điểm bài tập
            </h1>
            <p className="mt-2 text-gray-300">
              Quy trình chấm bài 3 bước: Tải đề, tải bài làm, và xem kết quả tức thì.
            </p>
          </div>
          
          {notification && (
              <div className="bg-green-900/50 border-l-4 border-green-400 text-green-200 p-4 my-6 rounded" role="alert">
                  <p className="font-bold">Thông báo</p>
                  <p>{notification}</p>
              </div>
          )}
          {error && (
              <div className="bg-red-900/50 border-l-4 border-red-400 text-red-200 p-4 my-6 rounded" role="alert">
                  <p className="font-bold">Lỗi</p>
                  <p>{error}</p>
              </div>
          )}

          <div className="flex justify-center">
              {renderContent()}
          </div>
        </div>
      </div>
      <footer className="fixed bottom-0 left-0 w-full bg-black/50 text-white p-3 text-center shadow-[0_-2px_10px_rgba(0,0,0,0.2)] text-sm z-50 backdrop-blur-sm">
        <p className="font-semibold">Được phát triển bởi Nguyễn Anh Tuấn</p>
        <div className="flex justify-center items-center gap-x-3 gap-y-1 flex-wrap px-2">
            <span>Liên hệ: Zalo <a href="tel:0982296922" className="underline hover:text-yellow-300 transition-colors">0982296922</a></span>
            <span className="hidden sm:inline">|</span>
            <span>Mail: <a href="mailto:kts.addbot@gmail.com" className="underline hover:text-yellow-300 transition-colors">kts.addbot@gmail.com</a></span>
        </div>
      </footer>
    </>
  );
}
