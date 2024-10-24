import React from "react";

const Avatar = ({ userId, username, online }) => {
  const colors = [
    "bg-red-200",
    "bg-green-200",
    "bg-blue-200",
    "bg-yellow-200",
    "bg-purple-200",
    "bg-pink-200",
    "bg-orange-200",
    "bg-teal-200",
    "bg-indigo-200",
    "bg-gray-200",
  ];

  const userIdBase10 = parseInt(userId, 16);
  const colorIndex = userIdBase10 % colors.length;
  const color = colors[colorIndex];
  return (
    <div
      className={`w-8 relative h-8 rounded-full ${color} flex items-center `}
    >
      <div className="text-center opacity-70 w-full">{username[0]}</div>
      {online && (
        <div className="absolute border border-white shadow-lg shadow-black  w-3 h-3 bg-green-500 rounded-full bottom-0 right-0"></div>
      )}
      {
        !online && (
            <div className="absolute border border-white shadow-lg shadow-black  w-3 h-3 bg-grey-500 rounded-full bottom-0 right-0"></div>
        )
      }
    </div>
  );
};

export default Avatar;
