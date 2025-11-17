
import React from 'react';
import type { GradingResult as GradingResultType } from '../types';
import { CheckCircleIcon, XCircleIcon, ThumbsUpIcon, ThumbsDownIcon } from './IconComponents';

interface GradingResultProps {
  result: GradingResultType;
  workImagePreviews: string[];
  onPointsChange: (exerciseId: number, points: number) => void;
  onCorrection: (exerciseId: number, problemId: number, newScore: 0 | 1) => void;
}

const GradingResult: React.FC<GradingResultProps> = ({ result, workImagePreviews, onPointsChange, onCorrection }) => {
  return (
    <div className="w-full space-y-8">
      <div className="text-center p-6 bg-gray-900/50 rounded-lg shadow-md border border-gray-700">
        <h2 className="text-2xl font-bold text-white">Kết quả tổng thể</h2>
        <p className="mt-2 text-4xl font-extrabold text-yellow-400">
          {result.totalScore.toFixed(2)} / {result.totalPossiblePoints}
          <span className="text-xl font-medium text-gray-300 ml-2">điểm</span>
        </p>
      </div>

      {workImagePreviews.length > 0 && (
          <div className="w-full">
              <h3 className="font-semibold text-lg mb-2 text-gray-200">Bài làm đã tải lên</h3>
              <div className="flex gap-4 overflow-x-auto p-2 bg-black/20 rounded-lg">
                  {workImagePreviews.map((src, index) => (
                      <img key={index} src={src} alt={`Bài làm của học sinh ${index + 1}`} className="object-contain max-h-96 rounded-lg shadow-lg flex-shrink-0" />
                  ))}
              </div>
          </div>
      )}

      <div className="space-y-6">
        <h3 className="font-semibold text-xl text-white border-b border-gray-600 pb-2">Chi tiết từng bài (có thể sửa điểm)</h3>
        {result.exercises.map((exercise) => (
          <div key={exercise.id} className="p-4 border border-gray-700 rounded-lg bg-gray-900/50 shadow-sm">
             <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4 pb-3 border-b border-gray-700">
                <h4 className="text-lg font-bold text-yellow-400 flex-shrink-0">{exercise.title}</h4>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4 flex-grow">
                    <div className="flex items-center gap-2">
                        <label htmlFor={`points-${exercise.id}`} className="text-sm font-medium text-gray-300 whitespace-nowrap">Thang điểm:</label>
                        <input
                            type="number"
                            id={`points-${exercise.id}`}
                            value={exercise.totalPossiblePoints}
                            onChange={(e) => onPointsChange(exercise.id, parseInt(e.target.value, 10) || 0)}
                            className="w-24 p-2 border border-gray-600 bg-gray-800 text-white rounded-md text-center font-bold text-lg focus:ring-yellow-500 focus:border-yellow-500"
                            min="0"
                        />
                    </div>
                    <div className="text-lg sm:text-xl font-black text-white bg-black/30 px-3 py-2 rounded-md text-center sm:text-right">
                        {exercise.studentScore.toFixed(2)} / {exercise.totalPossiblePoints}
                        <span className="text-base font-medium text-gray-300"> điểm</span>
                    </div>
                </div>
              </div>
              <div className="space-y-4">
                  {exercise.problems.map((prob, index) => (
                    <div key={prob.id} className={`p-3 rounded-lg ${prob.studentScore === 1 ? 'bg-green-900/40 border border-green-700' : 'bg-red-900/40 border border-red-700'}`}>
                       <div className="flex justify-between items-start">
                         <div className="flex-grow pr-4">
                           <p className="font-semibold text-gray-200"><span className="font-normal text-gray-400">Câu {index + 1}:</span> {prob.text}</p>
                           <p className="text-sm text-gray-400 mt-1">Đáp án đúng: {prob.solution}</p>
                           <div className="mt-2 pt-2 border-t border-gray-700 flex items-start gap-2">
                             <div className="flex-shrink-0 mt-0.5">
                               {prob.studentScore === 1 ? <CheckCircleIcon /> : <XCircleIcon />}
                             </div>
                             <p className="text-sm text-gray-300">{prob.feedback}</p>
                           </div>
                         </div>
                         <div className="flex flex-col gap-2 ml-2 flex-shrink-0">
                           <button
                             onClick={() => onCorrection(exercise.id, prob.id, 1)}
                             disabled={prob.studentScore === 1}
                             className={`p-1.5 rounded-full transition-colors ${prob.studentScore === 1 ? 'bg-green-500 text-white cursor-not-allowed' : 'bg-gray-600 text-gray-300 hover:bg-green-600'}`}
                             aria-label="Đánh dấu là Đúng"
                           >
                             <ThumbsUpIcon className="h-4 w-4" />
                           </button>
                           <button
                             onClick={() => onCorrection(exercise.id, prob.id, 0)}
                             disabled={prob.studentScore === 0}
                             className={`p-1.5 rounded-full transition-colors ${prob.studentScore === 0 ? 'bg-red-500 text-white cursor-not-allowed' : 'bg-gray-600 text-gray-300 hover:bg-red-600'}`}
                             aria-label="Đánh dấu là Sai"
                           >
                             <ThumbsDownIcon className="h-4 w-4" />
                           </button>
                         </div>
                       </div>
                    </div>
                  ))}
              </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GradingResult;