export default function ClassBadge({abbreviation,iconPath}:{abbreviation:string;iconPath?:string|null}) {
  return iconPath ? <img className="classicon" src={iconPath} alt={abbreviation}/> : <div className="classicon">{abbreviation}</div>;
}
